import { NextRequest, NextResponse } from 'next/server'
import { withAdminProtection } from '@/lib/security'
import { getQueue, saveQueue, UploadJob } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const { urls, titleSource, uploadOrder, streamerId, streamerName } = body

        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'urls array is required' }, { status: 400 })
        }

        const jobs = getQueue()
        const existingUrls = new Set(
            jobs.filter(j => j.status === 'queued' || j.status === 'processing').map(j => j.sourceUrl)
        )

        let created = 0
        let skipped = 0
        const now = new Date().toISOString()

        for (let i = 0; i < urls.length; i++) {
            const item = urls[i]
            const url = typeof item === 'string' ? item : item.url

            if (!url || existingUrls.has(url)) {
                skipped++
                continue
            }

            const priority = uploadOrder === 'desc' ? i : urls.length - i

            const newJob: UploadJob = {
                id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`,
                sourceUrl: url,
                status: 'queued',
                title: (typeof item === 'object' && item.title) || '',
                titleSource: titleSource || 'pageTitle',
                streamerId: streamerId || null,
                streamerName: streamerName || null,
                pageNumber: (typeof item === 'object' && item.pageNumber) || null,
                itemOrder: (typeof item === 'object' && item.itemOrder) || null,
                priority,
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
            existingUrls.add(url)
            created++
        }

        if (created > 0) {
            const saved = saveQueue(jobs)
            if (!saved) {
                return NextResponse.json({ error: 'Failed to save queue' }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true, created, skipped })
    } catch (err: any) {
        console.error('[Queue BulkJobs] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
