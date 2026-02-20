import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Atomic video add endpoint.
 * 
 * This solves the race condition in batch uploads:
 * Instead of the client reading the full DB, appending a video, and saving
 * (which causes overwrites when multiple uploads happen concurrently),
 * the SERVER reads the latest DB, appends the new video, and saves atomically.
 * 
 * A simple mutex lock is used to serialize concurrent requests,
 * ensuring each save includes all previously added videos.
 */

// Simple in-memory mutex to serialize DB writes
let writeLock: Promise<void> = Promise.resolve()

function acquireLock(): { promise: Promise<void>; release: () => void } {
    let release: () => void = () => { }
    const newLock = new Promise<void>((resolve) => {
        release = resolve
    })
    const previousLock = writeLock
    writeLock = newLock
    return { promise: previousLock, release }
}

export async function POST(req: NextRequest) {
    return withAdminProtection(req, async () => {
        // Acquire mutex lock - wait for any in-progress writes to finish
        const lock = acquireLock()

        try {
            // Wait for previous write to complete
            await lock.promise

            const body = await req.json()
            const { video, streamerId } = body

            if (!video || !streamerId) {
                return NextResponse.json(
                    { error: 'video and streamerId are required' },
                    { status: 400 }
                )
            }

            // 1. Read the LATEST database from B2
            let database: any = { streamers: [], videos: [] }
            try {
                const current = await getDatabase()
                if (current) database = current
            } catch (e) {
                console.warn('[add-video] Could not read current DB, starting with empty:', e)
            }

            // 2. Generate unique ID (timestamp + random to avoid collision in batch)
            const newVideo = {
                ...video,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                createdAt: new Date().toISOString(),
            }

            // 3. Add new video to the beginning of the list
            database.videos = [newVideo, ...(database.videos || [])]

            // 4. Increment the streamer's video count
            database.streamers = (database.streamers || []).map((s: any) =>
                s.id === streamerId
                    ? { ...s, videoCount: (s.videoCount || 0) + 1 }
                    : s
            )

            // 5. Save the updated database back to B2
            const saved = await saveDatabase(database)

            if (saved) {
                // Auto-ping search engines for new video
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kdance.xyz'
                    fetch(`${baseUrl}/api/seo/ping`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ urls: [`/video/${newVideo.id}`], type: 'new_content' }),
                    }).catch(e => console.error('SEO ping failed:', e))
                } catch { /* don't fail main operation */ }

                console.log(`✅ [add-video] Atomically added video "${newVideo.title || newVideo.id}" (total: ${database.videos.length})`)

                return NextResponse.json({
                    success: true,
                    video: newVideo,
                    totalVideos: database.videos.length,
                    totalStreamers: database.streamers.length,
                })
            } else {
                return NextResponse.json(
                    { error: 'Failed to save to B2' },
                    { status: 500 }
                )
            }
        } catch (error) {
            console.error('[add-video] Error:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        } finally {
            // Always release the lock
            lock.release()
        }
    })
}
