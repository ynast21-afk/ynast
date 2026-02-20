import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY
const B2_BUCKET_ID = process.env.B2_BUCKET_ID

async function authorizeB2() {
    const credentials = Buffer.from(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: { 'Authorization': `Basic ${credentials}` },
    })
    if (!response.ok) throw new Error('Failed to authorize with B2')
    return response.json()
}

async function getDownloadToken(auth: any) {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bucketId: B2_BUCKET_ID,
            fileNamePrefix: '',
            validDurationInSeconds: 3600,
        }),
    })
    if (!response.ok) throw new Error('Failed to get download authorization')
    return response.json()
}

// GET - Proxy video download from B2 (Admin only)
export async function GET(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const { searchParams } = new URL(request.url)
            const videoUrl = searchParams.get('url')

            if (!videoUrl) {
                return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
            }

            // Only allow B2 URLs for security
            if (!videoUrl.includes('backblazeb2.com')) {
                return NextResponse.json({ error: 'Only Backblaze B2 URLs are allowed' }, { status: 403 })
            }

            // Get B2 download authorization
            const auth = await authorizeB2()
            const dlAuth = await getDownloadToken(auth)

            // Append authorization token to the video URL
            const separator = videoUrl.includes('?') ? '&' : '?'
            const authorizedUrl = `${videoUrl}${separator}Authorization=${dlAuth.authorizationToken}`

            // Fetch the video from B2
            const videoRes = await fetch(authorizedUrl)
            if (!videoRes.ok) {
                return NextResponse.json({ error: `Failed to fetch video: ${videoRes.status}` }, { status: 502 })
            }

            const contentType = videoRes.headers.get('content-type') || 'video/mp4'
            const contentLength = videoRes.headers.get('content-length')

            // Stream the video back to the client
            const headers: Record<string, string> = {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=300',
            }
            if (contentLength) {
                headers['Content-Length'] = contentLength
            }

            return new NextResponse(videoRes.body, {
                status: 200,
                headers,
            })
        } catch (error: any) {
            console.error('Video proxy error:', error)
            return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
        }
    })
}
