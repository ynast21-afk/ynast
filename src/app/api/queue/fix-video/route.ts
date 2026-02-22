import { NextRequest, NextResponse } from 'next/server'
import { getQueue, addJob, UploadJob } from '@/lib/queue-store'

export const dynamic = 'force-dynamic'

/**
 * POST /api/queue/fix-video
 * 재생 불가 영상을 자동으로 remux 큐에 등록
 * 프론트엔드 에러 UI에서 호출됨
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoUrl, videoId, title } = body

        if (!videoUrl) {
            return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
        }

        // B2 URL에서 key 추출: https://xxx.backblazeb2.com/file/bucket-name/videos/filename.mp4 → videos/filename.mp4
        let b2Key = ''
        try {
            const parts = videoUrl.split('/')
            const fileIndex = parts.indexOf('file')
            if (fileIndex !== -1 && parts.length > fileIndex + 2) {
                // Skip bucket name (fileIndex + 1), take the rest
                b2Key = parts.slice(fileIndex + 2).join('/')
            }
        } catch {
            return NextResponse.json({ error: 'Invalid B2 URL format' }, { status: 400 })
        }

        if (!b2Key) {
            return NextResponse.json({ error: 'Could not extract B2 key from URL' }, { status: 400 })
        }

        const sourceUrl = `b2://${b2Key}`

        // Check for duplicate
        const jobs = await getQueue()
        const existing = jobs.find(
            j => j.sourceUrl === sourceUrl && (j.status === 'queued' || j.status === 'processing')
        )
        if (existing) {
            return NextResponse.json({ error: '이미 수정 대기열에 있습니다.', jobId: existing.id }, { status: 409 })
        }

        const now = new Date().toISOString()
        const newJob: UploadJob = {
            id: `fix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            sourceUrl,
            status: 'queued',
            title: title || 'Video Fix',
            titleSource: 'manual',
            streamerId: null,
            streamerName: null,
            pageNumber: null,
            itemOrder: null,
            priority: 0, // High priority for fixes
            b2Url: null,
            b2ThumbnailUrl: null,
            error: null,
            progress: 0,
            workerId: null,
            lockedAt: null,
            createdAt: now,
            updatedAt: now,
            retryCount: 0,
            videoId: videoId || null,
        }

        const saved = await addJob(newJob)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save fix job' }, { status: 500 })
        }

        return NextResponse.json({ success: true, job: newJob })
    } catch (err: any) {
        console.error('[Fix Video] POST error:', err)
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}
