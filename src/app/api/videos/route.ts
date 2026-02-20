import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection, withRateLimitProtection } from '@/lib/security'

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID

interface B2AuthResponse {
    authorizationToken: string
    apiUrl: string
    downloadUrl: string
}

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

// List files in bucket - Rate limited (public read)
export async function GET(request: NextRequest) {
    return withRateLimitProtection(request, async () => {
        try {
            const { searchParams } = new URL(request.url)
            const prefix = searchParams.get('prefix') || 'videos/'
            const maxFileCount = parseInt(searchParams.get('limit') || '100')

            const auth = await authorizeB2()

            const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bucketId: B2_BUCKET_ID,
                    prefix,
                    maxFileCount,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to list files')
            }

            const result = await response.json()

            const files = result.files.map((file: any) => ({
                id: file.fileId,
                name: file.fileName,
                size: file.contentLength,
                uploadTimestamp: file.uploadTimestamp,
                contentType: file.contentType,
                downloadUrl: `${auth.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${file.fileName}`,
            }))

            return NextResponse.json({
                files,
                nextFileName: result.nextFileName,
            })
        } catch (error) {
            return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
        }
    })
}

// Delete file - Admin only (protected)
export async function DELETE(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const { fileId, fileName } = await request.json()

            if (!fileId || !fileName) {
                return NextResponse.json({ error: 'File ID and name required' }, { status: 400 })
            }

            const auth = await authorizeB2()

            const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId,
                    fileName,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to delete file')
            }

            return NextResponse.json({ success: true })
        } catch (error) {
            return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
        }
    })
}
