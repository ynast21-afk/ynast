import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'
import { getQueue, saveQueue } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

const STALE_LOCK_MS = 10 * 60 * 1000 // 10 minutes

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { workerId } = body

        if (!workerId) {
            return NextResponse.json({ error: 'workerId is required' }, { status: 400 })
        }

        const jobs = getQueue()
        const now = Date.now()

        // Unlock stale jobs first
        let changed = false
        for (const job of jobs) {
            if (
                job.status === 'processing' &&
                job.lockedAt &&
                now - new Date(job.lockedAt).getTime() > STALE_LOCK_MS
            ) {
                job.status = 'queued'
                job.workerId = null
                job.lockedAt = null
                job.progress = 0
                job.updatedAt = new Date().toISOString()
                changed = true
            }
        }

        // Find next queued job (sorted by priority ascending)
        const queuedJobs = jobs
            .filter(j => j.status === 'queued')
            .sort((a, b) => a.priority - b.priority)

        const nextJob = queuedJobs[0]
        if (!nextJob) {
            if (changed) saveQueue(jobs)
            return NextResponse.json({ job: null })
        }

        // Claim it
        nextJob.status = 'processing'
        nextJob.workerId = workerId
        nextJob.lockedAt = new Date().toISOString()
        nextJob.updatedAt = new Date().toISOString()

        saveQueue(jobs)

        return NextResponse.json({ job: nextJob })
    } catch (err: any) {
        console.error('[Queue Claim] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
