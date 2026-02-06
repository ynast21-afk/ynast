import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID

interface B2AuthResponse {
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
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

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const folder = formData.get('folder') as string || 'videos'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Authorize with B2
        const auth = await authorizeB2()

        // Get upload URL
        const uploadUrl = await getUploadUrl(auth)

        // Read file content
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Calculate SHA1 hash
        const sha1 = crypto.createHash('sha1').update(buffer).digest('hex')

        // Generate unique filename
        const timestamp = Date.now()
        const ext = file.name.split('.').pop()
        const fileName = `${folder}/${timestamp}_${file.name}`

        // Upload to B2
        const uploadResponse = await fetch(uploadUrl.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadUrl.authorizationToken,
                'X-Bz-File-Name': encodeURIComponent(fileName),
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': buffer.length.toString(),
                'X-Bz-Content-Sha1': sha1,
            },
            body: buffer,
        })

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            console.error('B2 upload error:', errorText)
            throw new Error('Failed to upload to B2')
        }

        const uploadResult = await uploadResponse.json()

        // Construct the download URL
        const downloadUrl = `${auth.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${fileName}`

        return NextResponse.json({
            success: true,
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            contentType: uploadResult.contentType,
            contentLength: uploadResult.contentLength,
            downloadUrl,
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}

// Get signed URL for private videos (optional)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const fileId = searchParams.get('fileId')
        const duration = parseInt(searchParams.get('duration') || '3600') // Default 1 hour

        if (!fileId) {
            return NextResponse.json({ error: 'File ID required' }, { status: 400 })
        }

        const auth = await authorizeB2()

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

        return NextResponse.json({
            authorizationToken: result.authorizationToken,
            downloadUrl: auth.downloadUrl,
        })

    } catch (error) {
        console.error('Get URL error:', error)
        return NextResponse.json(
            { error: 'Failed to get download URL' },
            { status: 500 }
        )
    }
}
