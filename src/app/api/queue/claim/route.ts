import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'
import { getQueue, updateJob } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

const STALE_LOCK_MS = 10 * 60 * 1000 // 10 minutes

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { workerId } = body

        if (!workerId) {
            return NextResponse.json({ error: 'workerId is required' }, { status: 400 })
        }

        const jobs = await getQueue()
        const now = Date.now()
        const isoNow = new Date().toISOString()

        // Unlock stale jobs (individual Firestore updates, not batch rewrite)
        for (const job of jobs) {
            if (
                job.status === 'processing' &&
                job.lockedAt &&
                now - new Date(job.lockedAt).getTime() > STALE_LOCK_MS
            ) {
                await updateJob(job.id, {
                    status: 'queued',
                    workerId: null,
                    lockedAt: null,
                    progress: 0,
                    updatedAt: isoNow,
                })
                job.status = 'queued' // Update in-memory for next step
            }
        }

        // Find next queued job (sorted by priority ascending)
        const queuedJobs = jobs
            .filter(j => j.status === 'queued')
            .sort((a, b) => a.priority - b.priority)

        const nextJob = queuedJobs[0]
        if (!nextJob) {
            return NextResponse.json({ job: null })
        }

        // Claim it — single document update
        const updates = {
            status: 'processing' as const,
            workerId,
            lockedAt: isoNow,
            updatedAt: isoNow,
        }
        await updateJob(nextJob.id, updates)

        return NextResponse.json({ job: { ...nextJob, ...updates } })
    } catch (err: any) {
        console.error('[Queue Claim] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
