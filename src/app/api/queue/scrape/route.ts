import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// GET - Scrape a page for video URLs
// This is a lightweight proxy endpoint that avoids CORS issues
// The actual heavy processing (download + upload) is done by the worker
export async function GET(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const { searchParams } = new URL(request.url)
            const page = parseInt(searchParams.get('page') || '1')

            // Target URL pattern for skbj.tv pages
            const targetUrl = `https://skbj.tv/page/${page}`

            // Note: This endpoint scrapes the target page for video links.
            // skbj.tv requires authentication, so for now we return a placeholder
            // that instructs the admin to use the worker with cookie-based auth.
            //
            // In production, the worker handles the actual scraping with cookies.
            // This endpoint can be extended to support other video sites.

            // Try to fetch the page (may fail if login required)
            try {
                const res = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    },
                    cache: 'no-store',
                })

                if (!res.ok) {
                    return NextResponse.json({
                        videos: [],
                        error: `페이지 접근 실패 (HTTP ${res.status}). 로그인이 필요할 수 있습니다.`,
                        page,
                    })
                }

                const html = await res.text()

                // Extract video links from the page HTML
                // Pattern: look for links to video detail pages
                const videoPattern = /href=["'](https?:\/\/skbj\.tv\/[^"']*(?:video|watch|play)[^"']*)["']/gi
                const titlePattern = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]+)<\/a>/gi

                const videos: Array<{ url: string, title: string }> = []
                const seenUrls = new Set<string>()

                // Try generic link extraction
                let match
                while ((match = videoPattern.exec(html)) !== null) {
                    const url = match[1]
                    if (!seenUrls.has(url)) {
                        seenUrls.add(url)
                        videos.push({ url, title: '' })
                    }
                }

                // If no video-specific pattern found, try to find any content links
                if (videos.length === 0) {
                    // Alternative: extract all internal links that look like content pages
                    const linkPattern = /href=["'](https?:\/\/skbj\.tv\/\d+[^"']*)["']/gi
                    while ((match = linkPattern.exec(html)) !== null) {
                        const url = match[1]
                        if (!seenUrls.has(url)) {
                            seenUrls.add(url)
                            videos.push({ url, title: '' })
                        }
                    }
                }

                return NextResponse.json({
                    videos,
                    page,
                    total: videos.length,
                })

            } catch (fetchError: any) {
                return NextResponse.json({
                    videos: [],
                    error: `페이지 가져오기 실패: ${fetchError.message}`,
                    page,
                })
            }

        } catch (error: any) {
            console.error('Error in scrape endpoint:', error)
            return NextResponse.json({ error: 'Scraping failed', details: error?.message }, { status: 500 })
        }
    })
}
