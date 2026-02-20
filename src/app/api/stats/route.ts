import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'
import { withRateLimitProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// POST - Update stats (video views/likes OR streamer followers)
// No admin token required — rate-limited only
export async function POST(request: NextRequest) {
    return withRateLimitProtection(request, async () => {
        try {
            const body = await request.json()
            const { videoId, streamerId, action } = body

            if (!action) {
                return NextResponse.json({ error: 'Missing action' }, { status: 400 })
            }

            const validActions = ['view', 'like', 'unlike', 'follow_streamer', 'unfollow_streamer']
            if (!validActions.includes(action)) {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
            }

            // Load current DB from B2
            const data = await getDatabase()
            if (!data) {
                return NextResponse.json({ error: 'Database not found' }, { status: 404 })
            }

            // ==========================================
            // CASE 1: Streamer Follow/Unfollow
            // ==========================================
            if (action === 'follow_streamer' || action === 'unfollow_streamer') {
                if (!streamerId) return NextResponse.json({ error: 'Missing streamerId' }, { status: 400 })

                const streamerIndex = data.streamers?.findIndex((s: any) => s.id === streamerId)
                if (streamerIndex === -1 || streamerIndex === undefined) {
                    return NextResponse.json({ error: 'Streamer not found' }, { status: 404 })
                }

                if (action === 'follow_streamer') {
                    data.streamers[streamerIndex].followers = (data.streamers[streamerIndex].followers || 0) + 1
                } else {
                    data.streamers[streamerIndex].followers = Math.max(0, (data.streamers[streamerIndex].followers || 0) - 1)
                }

                const success = await saveDatabase(data, false)
                if (success) {
                    return NextResponse.json({
                        success: true,
                        followers: data.streamers[streamerIndex].followers
                    })
                } else {
                    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
                }
            }

            // ==========================================
            // CASE 2: Video View/Like/Unlike
            // ==========================================
            if (['view', 'like', 'unlike'].includes(action)) {
                if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })

                const videoIndex = data.videos?.findIndex((v: any) => v.id === videoId)
                if (videoIndex === -1 || videoIndex === undefined) {
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
                    return NextResponse.json({
                        success: true,
                        views: data.videos[videoIndex].views,
                        likes: data.videos[videoIndex].likes
                    })
                } else {
                    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
                }
            }

            return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })

        } catch (error) {
            console.error('Stats API error:', error)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}
