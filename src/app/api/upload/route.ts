import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection, withRateLimitProtection } from '@/lib/security'

/**
 * 확장자 기반 MIME 타입 해결기
 * 브라우저의 file.type이 빈 문자열이거나 잘못된 경우가 많으므로,
 * 파일 확장자에서 올바른 Content-Type을 결정합니다.
 */
function resolveContentType(fileName: string, providedType?: string): string {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))

    const mimeMap: Record<string, string> = {
        // 비디오 형식 - 폭넓은 지원
        '.mp4': 'video/mp4',
        '.m4v': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.3gp': 'video/3gpp',
        '.3g2': 'video/3gpp2',
        '.ts': 'video/mp2t',
        '.mts': 'video/mp2t',
        '.m2ts': 'video/mp2t',
        '.mpg': 'video/mpeg',
        '.mpeg': 'video/mpeg',
        '.ogv': 'video/ogg',
        '.f4v': 'video/mp4',
        // 이미지 형식
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
        '.avif': 'image/avif',
        // 오디오 형식
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
    }

    // 1순위: 확장자 기반 정확한 매핑
    if (mimeMap[ext]) return mimeMap[ext]

    // 2순위: 브라우저가 제공한 타입 (비어있거나 generic이 아닌 경우)
    if (providedType && providedType !== '' && providedType !== 'application/octet-stream') {
        return providedType
    }

    // 3순위: 확장자로 카테고리 추론
    const videoExts = ['.mp4', '.m4v', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.mpg', '.mpeg', '.ogv', '.f4v']
    if (videoExts.includes(ext)) return 'video/mp4' // 안전한 폴백

    return 'application/octet-stream'
}

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
    if (auth.allowed?.bucketName) {
        return auth.allowed.bucketName
    }

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

    const envBucket = process.env.B2_BUCKET_NAME || ''
    if (envBucket === 'kbjkbj' || !envBucket) {
        console.log('[API Fix] Detected invalid or missing bucket name. Forcing "yna-backup".')
        return 'yna-backup'
    }

    return envBucket
}

// POST - Upload file (Admin only)
export async function POST(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const formData = await request.formData()
            const action = formData.get('action') as string
            const folder = formData.get('folder') as string || 'videos'

            // Authorize with B2
            const auth = await authorizeB2()

            if (action === 'start_large_file') {
                const fileName = formData.get('fileName') as string
                const contentType = formData.get('contentType') as string

                // Validate file extension - allow broad but safe file types
                const allowedExtensions = [
                    // 비디오
                    '.mp4', '.m4v', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv',
                    '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.mpg', '.mpeg', '.ogv', '.f4v',
                    // 이미지
                    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif',
                    // 오디오
                    '.mp3', '.wav', '.ogg', '.aac', '.flac',
                ]
                const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
                if (!allowedExtensions.includes(ext)) {
                    return NextResponse.json({ error: `File type ${ext} is not allowed. Supported: ${allowedExtensions.join(', ')}` }, { status: 400 })
                }

                const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_start_large_file`, {
                    method: 'POST',
                    headers: {
                        'Authorization': auth.authorizationToken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bucketId: B2_BUCKET_ID,
                        fileName: `${folder}/${fileName}`,
                        contentType: resolveContentType(fileName, contentType),
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
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}

// DELETE - Delete file (Admin only)
export async function DELETE(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const { searchParams } = new URL(request.url)
            const fileUrl = searchParams.get('url')

            if (!fileUrl) {
                return NextResponse.json({ error: 'URL is required' }, { status: 400 })
            }

            const auth = await authorizeB2()
            const bucketName = await resolveBucketName(auth)

            const urlObj = new URL(fileUrl)
            const pathParts = urlObj.pathname.split('/')
            const fileName = decodeURIComponent(pathParts.slice(3).join('/'))

            if (!fileName) {
                return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
            }

            console.log(`[B2 Delete] Attempting to delete: ${fileName} from bucket: ${bucketName}`)

            const listVersionsRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_versions`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bucketId: B2_BUCKET_ID,
                    startFileName: fileName,
                    prefix: fileName,
                }),
            })

            if (!listVersionsRes.ok) {
                throw new Error('Failed to list file versions')
            }

            const { files } = await listVersionsRes.json()
            const deletions = files.map(async (file: any) => {
                const delRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
                    method: 'POST',
                    headers: {
                        'Authorization': auth.authorizationToken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileId: file.fileId,
                        fileName: file.fileName,
                    }),
                })
                return delRes.ok
            })

            const results = await Promise.all(deletions)
            const successCount = results.filter(Boolean).length

            return NextResponse.json({
                success: true,
                message: `Deleted ${successCount} versions of ${fileName}`,
                fileName
            })
        } catch (error) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}

// GET - Get upload credentials or download authorization (Admin only for upload, rate limited for download)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // Upload credential requests require admin auth
    if (type === 'upload' || type === 'upload_part') {
        return withAdminProtection(request, async () => {
            try {
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

                // upload_part
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
            } catch (error) {
                return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
            }
        })
    }

    // Download authorization - rate limited but public (users need to view videos)
    return withRateLimitProtection(request, async () => {
        try {
            const duration = parseInt(searchParams.get('duration') || '3600')
            const auth = await authorizeB2()

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

            if (!response.ok) throw new Error('Failed to get download authorization')

            const result = await response.json()
            const realBucketName = await resolveBucketName(auth)

            return NextResponse.json({
                authorizationToken: result.authorizationToken,
                downloadUrl: auth.downloadUrl,
                bucketName: realBucketName
            })
        } catch (error) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}
