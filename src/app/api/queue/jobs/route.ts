import { NextRequest, NextResponse } from 'next/server'
import { getQueue, addJob, deleteJob, UploadJob } from '@/lib/queue-store'
import { verifyAdminToken } from '@/lib/security'

export const dynamic = 'force-dynamic'

// Lightweight auth helper
function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// GET: list all jobs
export async function GET(request: NextRequest) {
    if (!verifyAdminToken(request)) return unauthorized()
    const jobs = await getQueue()
    return NextResponse.json({ jobs })
}

// POST: add a single job
export async function POST(request: NextRequest) {
    if (!verifyAdminToken(request)) return unauthorized()

    try {
        const body = await request.json()
        const { sourceUrl, manualTitle, titleSource, streamerId: reqStreamerId, streamerName: reqStreamerName } = body

        if (!sourceUrl) {
            return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
        }

        // Check for duplicate (same URL, not done/failed) — still needs full queue read
        const jobs = await getQueue()
        const existing = jobs.find(
            j => j.sourceUrl === sourceUrl && (j.status === 'queued' || j.status === 'processing')
        )
        if (existing) {
            return NextResponse.json({ error: '이미 대기열에 있는 URL입니다.' }, { status: 409 })
        }

        const now = new Date().toISOString()
        const newJob: UploadJob = {
            id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            sourceUrl,
            status: 'queued',
            title: manualTitle || '',
            titleSource: titleSource || 'pageTitle',
            streamerId: reqStreamerId || null,
            streamerName: reqStreamerName || null,
            pageNumber: null,
            itemOrder: null,
            priority: jobs.length,
            b2Url: null,
            b2ThumbnailUrl: null,
            error: null,
            progress: 0,
            workerId: null,
            lockedAt: null,
            createdAt: now,
            updatedAt: now,
            retryCount: 0,
        }

        // Single document add (not batch rewrite)
        const saved = await addJob(newJob)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save job' }, { status: 500 })
        }

        return NextResponse.json({ success: true, job: newJob })
    } catch (err: any) {
        console.error('[Queue Jobs] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

// DELETE: remove a job by id
export async function DELETE(request: NextRequest) {
    if (!verifyAdminToken(request)) return unauthorized()

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        // Single document delete (not batch rewrite)
        const deleted = await deleteJob(id)
        if (!deleted) {
            return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}
