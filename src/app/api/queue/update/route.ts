import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'
import { getQueue, saveQueue } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { jobId, status, progress, error, b2Url, b2ThumbnailUrl } = body

        if (!jobId) {
            return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
        }

        const jobs = getQueue()
        const job = jobs.find(j => j.id === jobId)

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        const now = new Date().toISOString()

        if (status) job.status = status
        if (typeof progress === 'number') job.progress = progress
        if (error !== undefined) job.error = error
        if (b2Url !== undefined) job.b2Url = b2Url
        if (b2ThumbnailUrl !== undefined) job.b2ThumbnailUrl = b2ThumbnailUrl
        job.updatedAt = now

        // On failure, increment retry count
        if (status === 'failed') {
            job.retryCount = (job.retryCount || 0) + 1
        }

        // On done/failed, release lock
        if (status === 'done' || status === 'failed') {
            job.workerId = null
            job.lockedAt = null
        }

        // On retry (queued from failed), reset
        if (status === 'queued') {
            job.workerId = null
            job.lockedAt = null
            job.progress = 0
            job.error = null
        }

        const saved = saveQueue(jobs)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save queue' }, { status: 500 })
        }

        return NextResponse.json({ success: true, job })
    } catch (err: any) {
        console.error('[Queue Update] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
