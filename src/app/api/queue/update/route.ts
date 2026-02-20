import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'
import { getJob, updateJob } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { jobId, status, progress, error, b2Url, b2ThumbnailUrl, title } = body

        if (!jobId) {
            return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
        }

        // Read only the single job from Firestore (instead of entire queue)
        const job = await getJob(jobId)
        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        const now = new Date().toISOString()
        const updates: Record<string, any> = { updatedAt: now }

        if (status) updates.status = status
        if (typeof progress === 'number') updates.progress = progress
        if (error !== undefined) updates.error = error
        if (b2Url !== undefined) updates.b2Url = b2Url
        if (b2ThumbnailUrl !== undefined) updates.b2ThumbnailUrl = b2ThumbnailUrl
        if (title !== undefined) updates.title = title

        // On failure, increment retry count
        if (status === 'failed') {
            updates.retryCount = (job.retryCount || 0) + 1
        }

        // On done/failed, release lock
        if (status === 'done' || status === 'failed') {
            updates.workerId = null
            updates.lockedAt = null
        }

        // On retry (queued from failed), reset
        if (status === 'queued') {
            updates.workerId = null
            updates.lockedAt = null
            updates.progress = 0
            updates.error = null
        }

        // Single-document update (not batch rewrite)
        const saved = await updateJob(jobId, updates)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
        }

        return NextResponse.json({ success: true, job: { ...job, ...updates } })
    } catch (err: any) {
        console.error('[Queue Update] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
