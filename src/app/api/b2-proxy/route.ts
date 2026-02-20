import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID || ''
const B2_KEY = process.env.B2_APPLICATION_KEY || ''
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || ''

let cachedAuth: { authorizationToken: string; downloadUrl: string; expiresAt: number } | null = null

async function getB2Auth() {
    if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
        return cachedAuth
    }

    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64'),
        },
        cache: 'no-store',
    })

    if (!res.ok) {
        throw new Error(`B2 auth failed: ${res.status}`)
    }

    const data = await res.json()
    cachedAuth = {
        authorizationToken: data.authorizationToken,
        downloadUrl: data.downloadUrl,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 hours
    }
    return cachedAuth
}

// GET /api/b2-proxy?file=videos/xxx.mp4
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filePath = searchParams.get('file')

        if (!filePath) {
            return NextResponse.json({ error: 'file parameter required' }, { status: 400 })
        }

        // Security: only allow files from videos/, thumbnails/, and previews/ folders
        if (!filePath.startsWith('videos/') && !filePath.startsWith('thumbnails/') && !filePath.startsWith('previews/')) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 403 })
        }

        const auth = await getB2Auth()
        const downloadUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${filePath}`

        const b2Res = await fetch(downloadUrl, {
            headers: {
                'Authorization': auth.authorizationToken,
            },
        })

        if (!b2Res.ok) {
            return NextResponse.json(
                { error: `B2 download failed: ${b2Res.status}` },
                { status: b2Res.status }
            )
        }

        const contentType = b2Res.headers.get('content-type') || 'video/mp4'
        const contentLength = b2Res.headers.get('content-length')

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // 24 hour cache
        }
        if (contentLength) headers['Content-Length'] = contentLength

        // Stream the response
        return new Response(b2Res.body, { status: 200, headers })
    } catch (err: any) {
        console.error('[B2 Proxy] Error:', err.message)
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
    }
}
