import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * PATCH video metadata (e.g. duration) by video ID.
 * Also supports public duration-only updates without admin token,
 * for client-side auto-detection of video duration.
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

async function handleUpdateVideo(request: NextRequest) {
    const { promise: waitForLock, release } = acquireLock()
    await waitForLock

    try {
        const body = await request.json()
        const { videoId, duration } = body

        if (!videoId || typeof videoId !== 'string') {
            return NextResponse.json({ error: 'videoId required' }, { status: 400 })
        }

        // Only allow duration updates (safe field)
        if (!duration || typeof duration !== 'string') {
            return NextResponse.json({ error: 'duration required' }, { status: 400 })
        }

        // Validate duration format (M:SS or H:MM:SS)
        if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(duration)) {
            return NextResponse.json({ error: 'Invalid duration format' }, { status: 400 })
        }

        const db = await getDatabase()
        const idx = db.videos.findIndex((v: any) => v.id === videoId)

        if (idx < 0) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 })
        }

        // Only update if current duration is 0:00 (don't overwrite valid durations)
        if (db.videos[idx].duration && db.videos[idx].duration !== '0:00') {
            return NextResponse.json({ success: true, message: 'Duration already set', duration: db.videos[idx].duration })
        }

        db.videos[idx].duration = duration
        await saveDatabase(db)

        return NextResponse.json({ success: true, duration })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
    } finally {
        release()
    }
}

export const POST = handleUpdateVideo
