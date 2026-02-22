import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://kdance.xyz'

/**
 * API route to notify search engines about new/updated content
 * Called automatically when new videos or streamers are added
 * 
 * Supports:
 * - Google: Ping sitemap via Google Search Console API
 * - IndexNow: Bing, Yandex, DuckDuckGo, etc.
 */
export async function POST(request: NextRequest) {
    try {
        const { urls, type } = await request.json()

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
        }

        const results: any = {
            google: null,
            indexnow: null,
        }

        // 1. Ping Google with updated sitemap
        try {
            const sitemapUrl = `${BASE_URL}/sitemap2.xml`
            const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
            const googleRes = await fetch(googlePingUrl, { method: 'GET' })
            results.google = {
                status: googleRes.status,
                success: googleRes.ok,
            }
            console.log(`Google sitemap ping: ${googleRes.status}`)
        } catch (e) {
            console.error('Google ping failed:', e)
            results.google = { success: false, error: String(e) }
        }

        // 2. IndexNow for Bing, Yandex, DuckDuckGo, Naver
        try {
            const indexNowKey = process.env.INDEXNOW_KEY
            if (indexNowKey) {
                const indexNowBody = {
                    host: 'kdance.xyz',
                    key: indexNowKey,
                    keyLocation: `${BASE_URL}/${indexNowKey}.txt`,
                    urlList: urls.map((u: string) =>
                        u.startsWith('http') ? u : `${BASE_URL}${u}`
                    ),
                }

                const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(indexNowBody),
                })
                results.indexnow = {
                    status: indexNowRes.status,
                    success: indexNowRes.ok || indexNowRes.status === 202,
                }
                console.log(`IndexNow ping: ${indexNowRes.status}`)
            } else {
                results.indexnow = { skipped: true, reason: 'INDEXNOW_KEY not set' }
            }
        } catch (e) {
            console.error('IndexNow ping failed:', e)
            results.indexnow = { success: false, error: String(e) }
        }

        return NextResponse.json({
            success: true,
            urlCount: urls.length,
            type: type || 'general',
            results,
            timestamp: new Date().toISOString(),
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: 'Failed to notify search engines', details: e.message },
            { status: 500 }
        )
    }
}
