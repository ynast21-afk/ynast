import { NextRequest, NextResponse } from 'next/server'
import { getQueue, saveQueue, UploadJob } from '@/lib/queue-store'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// GET: list all jobs
async function handleGET() {
    const jobs = getQueue()
    return NextResponse.json({ jobs })
}

// POST: add a single job
async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { sourceUrl, manualTitle, titleSource, streamerId: reqStreamerId, streamerName: reqStreamerName } = body

        if (!sourceUrl) {
            return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
        }

        const jobs = getQueue()

        // Check for duplicate (same URL, not done/failed)
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

        jobs.push(newJob)
        const saved = saveQueue(jobs)

        if (!saved) {
            return NextResponse.json({ error: 'Failed to save queue' }, { status: 500 })
        }

        return NextResponse.json({ success: true, job: newJob })
    } catch (err: any) {
        console.error('[Queue Jobs] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

// DELETE: remove a job by id
async function handleDELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const jobs = getQueue()
        const filtered = jobs.filter(j => j.id !== id)

        if (filtered.length === jobs.length) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        saveQueue(filtered)
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    return withAdminProtection(request, handleGET)
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}

export async function DELETE(request: NextRequest) {
    return withAdminProtection(request, () => handleDELETE(request))
}
