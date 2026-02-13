import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'
import { withRateLimitProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// POST - Update individual video stats (views/likes)
// No admin token required — rate-limited only
// This prevents non-admin users from needing to POST the entire DB
export async function POST(request: NextRequest) {
    return withRateLimitProtection(request, async () => {
        try {
            const body = await request.json()
            const { videoId, action } = body

            if (!videoId || !action) {
                return NextResponse.json({ error: 'Missing videoId or action' }, { status: 400 })
            }

            if (!['view', 'like', 'unlike'].includes(action)) {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
            }

            // Load current DB from B2
            const data = await getDatabase()
            if (!data || !data.videos) {
                return NextResponse.json({ error: 'Database not found' }, { status: 404 })
            }

            // Find and update the specific video
            const videoIndex = data.videos.findIndex((v: any) => v.id === videoId)
            if (videoIndex === -1) {
                return NextResponse.json({ error: 'Video not found' }, { status: 404 })
            }

            switch (action) {
                case 'view':
                    data.videos[videoIndex].views = (data.videos[videoIndex].views || 0) + 1
                    break
                case 'like':
                    data.videos[videoIndex].likes = (data.videos[videoIndex].likes || 0) + 1
                    break
                case 'unlike':
                    data.videos[videoIndex].likes = Math.max(0, (data.videos[videoIndex].likes || 0) - 1)
                    break
            }

            // Save back to B2 (without backup — stats changes are frequent and small)
            const success = await saveDatabase(data, false)
            if (success) {
                return NextResponse.json({ success: true, views: data.videos[videoIndex].views, likes: data.videos[videoIndex].likes })
            } else {
                return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
            }
        } catch (error) {
            console.error('Stats API error:', error)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}
