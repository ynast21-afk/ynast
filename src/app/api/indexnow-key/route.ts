import { NextRequest } from 'next/server'

/**
 * IndexNow Key Verification Endpoint
 * 
 * IndexNow requires a key file at /{key}.txt to verify ownership.
 * This API route dynamically serves the key from the INDEXNOW_KEY env variable
 * so there's no need to create a static file.
 * 
 * URL pattern: /api/indexnow-key → served via rewrite from /{key}.txt
 */

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const key = process.env.INDEXNOW_KEY

    if (!key) {
        return new Response('IndexNow key not configured', { status: 404 })
    }

    // Return the key as plain text (IndexNow spec)
    return new Response(key, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=86400',
        },
    })
}
