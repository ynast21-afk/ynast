import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'
import { withAdminProtection, withRateLimitProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// GET - Public read (rate limited)
export async function GET(request: NextRequest) {
    return withRateLimitProtection(request, async () => {
        try {
            const data = await getDatabase()
            if (!data) return NextResponse.json(null)
            return NextResponse.json(data)
        } catch (error) {
            return NextResponse.json({ error: 'Failed to fetch database' }, { status: 500 })
        }
    })
}

// POST - Admin only (protected)
export async function POST(req: NextRequest) {
    return withAdminProtection(req, async () => {
        try {
            const body = await req.json()
            if (!body.streamers || !body.videos) return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })

            // Get current data to detect new content
            let oldData: any = null
            try {
                oldData = await getDatabase()
            } catch { /* first upload */ }

            const success = await saveDatabase(body)
            if (success) {
                // Auto-ping search engines with new URLs
                try {
                    const newUrls: string[] = []
                    const oldVideoIds = new Set(oldData?.videos?.map((v: any) => v.id) || [])
                    const oldStreamerIds = new Set(oldData?.streamers?.map((s: any) => s.id) || [])

                    // Find new videos
                    body.videos?.forEach((v: any) => {
                        if (!oldVideoIds.has(v.id)) {
                            newUrls.push(`/video/${v.id}`)
                        }
                    })
                    // Find new streamers
                    body.streamers?.forEach((s: any) => {
                        if (!oldStreamerIds.has(s.id)) {
                            newUrls.push(`/actors/${s.id}`)
                        }
                    })

                    // Notify search engines of new content
                    if (newUrls.length > 0) {
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kdance.xyz'
                        fetch(`${baseUrl}/api/seo/ping`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ urls: newUrls, type: 'new_content' }),
                        }).catch(e => console.error('SEO ping failed:', e))
                        console.log(`SEO ping sent for ${newUrls.length} new URLs`)
                    }
                } catch (e) {
                    console.error('SEO auto-ping error:', e)
                    // Don't fail the main operation
                }

                return NextResponse.json({ success: true })
            } else {
                return NextResponse.json({ error: 'Failed to save to B2' }, { status: 500 })
            }
        } catch (error) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}
