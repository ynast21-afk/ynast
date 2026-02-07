import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID

interface B2AuthResponse {
    accountId: string
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
    allowed: {
        bucketId: string
        bucketName: string
        capabilities: string[]
    }
}

interface B2UploadUrlResponse {
    uploadUrl: string
    authorizationToken: string
}

// Authorize with Backblaze B2
async function authorizeB2(): Promise<B2AuthResponse> {
    const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')

    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${credentials}`,
        },
    })

    if (!response.ok) {
        throw new Error('Failed to authorize with B2')
    }

    return response.json()
}

// Get upload URL
async function getUploadUrl(auth: B2AuthResponse): Promise<B2UploadUrlResponse> {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bucketId: B2_BUCKET_ID,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to get upload URL')
    }

    return response.json()
}

// Helper to determine the real bucket name
async function resolveBucketName(auth: B2AuthResponse): Promise<string> {
    // 1. Try to get from auth response (present for restricted keys)
    if (auth.allowed?.bucketName) {
        return auth.allowed.bucketName
    }

    // 2. Try to list buckets (if master key)
    try {
        const bucketRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
            method: 'POST',
            headers: { 'Authorization': auth.authorizationToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: auth.accountId, bucketId: B2_BUCKET_ID }),
        })
        const bucketData = await bucketRes.json()
        if (bucketData.buckets?.[0]?.bucketName) {
            return bucketData.buckets[0].bucketName
        }
    } catch (e) {
        console.error('Failed to resolve bucket name via list_buckets:', e)
    }

    // 3. Fallback to Env Var
    // 3. Fallback to Env Var (or empty if not set)
    const envBucket = process.env.B2_BUCKET_NAME || ''

    // HOTFIX: Detect and correct known misconfiguration
    if (envBucket === 'kbjkbj' || !envBucket) {
        console.log('[API Fix] Detected invalid or missing bucket name. Forcing "yna-backup".')
        return 'yna-backup'
    }

    return envBucket
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const action = formData.get('action') as string
        const folder = formData.get('folder') as string || 'videos'

        // Authorize with B2
        const auth = await authorizeB2()

        if (action === 'start_large_file') {
            const fileName = formData.get('fileName') as string
            const contentType = formData.get('contentType') as string

            const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_start_large_file`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bucketId: B2_BUCKET_ID,
                    fileName: `${folder}/${fileName}`,
                    contentType: contentType || 'application/octet-stream',
                }),
            })

            if (!response.ok) throw new Error('Failed to start large file')
            return NextResponse.json(await response.json())
        }


        if (action === 'finish_large_file') {
            const fileId = formData.get('fileId') as string
            const partSha1Array = JSON.parse(formData.get('partSha1Array') as string)

            const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_finish_large_file`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId,
                    partSha1Array,
                }),
            })

            if (!response.ok) {
                const err = await response.text()
                console.error('Finish large file error:', err)
                throw new Error('Failed to finish large file')
            }

            const result = await response.json()
            const bucketName = await resolveBucketName(auth)
            const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${result.fileName}`

            return NextResponse.json({ ...result, downloadUrl })
        }

        return NextResponse.json({ error: 'Direct upload is required for files' }, { status: 400 })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}

// Get signed URL or upload credentials
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const fileId = searchParams.get('fileId')
        const type = searchParams.get('type') // 'upload' or 'download'
        const duration = parseInt(searchParams.get('duration') || '3600') // Default 1 hour

        const auth = await authorizeB2()


        if (type === 'upload') {
            const uploadUrl = await getUploadUrl(auth)
            const realBucketName = await resolveBucketName(auth)

            return NextResponse.json({
                uploadUrl: uploadUrl.uploadUrl,
                authorizationToken: uploadUrl.authorizationToken,
                downloadUrl: auth.downloadUrl,
                bucketName: realBucketName
            })
        }

        if (type === 'upload_part') {
            const fileId = searchParams.get('fileId')
            if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

            const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId }),
            })

            if (!response.ok) throw new Error('Failed to get upload part URL')
            return NextResponse.json(await response.json())
        }

        if (!fileId && type !== 'download') {
            return NextResponse.json({ error: 'File ID required' }, { status: 400 })
        }

        // Get download authorization for private files
        const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bucketId: B2_BUCKET_ID,
                fileNamePrefix: '',
                validDurationInSeconds: duration,
            }),
        })

        const result = await response.json()
        const realBucketName = await resolveBucketName(auth)

        console.log('[API Debug] Bucket Name Resolved:', realBucketName)

        return NextResponse.json({
            authorizationToken: result.authorizationToken,
            downloadUrl: auth.downloadUrl,
            bucketName: realBucketName
        })

    } catch (error) {
        console.error('Get URL error:', error)
        return NextResponse.json(
            { error: 'Failed to get download URL' },
            { status: 500 }
        )
    }
}
