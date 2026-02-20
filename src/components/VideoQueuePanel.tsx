'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ============================================
// Types
// ============================================
interface Streamer {
    id: string
    name: string
    koreanName?: string
    profileImage?: string
}

interface UploadJob {
    id: string
    sourceUrl: string
    status: 'queued' | 'processing' | 'done' | 'failed'
    title: string
    titleSource: string
    streamerId: string | null
    streamerName: string | null
    pageNumber: number | null
    itemOrder: number | null
    priority: number
    b2Url: string | null
    b2ThumbnailUrl: string | null
    error: string | null
    progress: number
    workerId: string | null
    lockedAt: string | null
    createdAt: string
    updatedAt: string
    retryCount: number
}

// ============================================
// VideoQueuePanel Component
// ============================================
export default function VideoQueuePanel() {
    const { adminToken } = useAuth()

    // State
    const [titleSource, setTitleSource] = useState<'pageTitle' | 'fileName'>('pageTitle')
    const [jobs, setJobs] = useState<UploadJob[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [urlInput, setUrlInput] = useState('')
    const [manualTitle, setManualTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [selectedStreamerId, setSelectedStreamerId] = useState<string>('')

    // Page collection state
    const [startPage, setStartPage] = useState(1)
    const [endPage, setEndPage] = useState(17)
    const [uploadOrder, setUploadOrder] = useState<'asc' | 'desc'>('asc')
    const [isCollecting, setIsCollecting] = useState(false)
    const [collectionProgress, setCollectionProgress] = useState('')

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Header helper
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null)
        if (token) headers['x-admin-token'] = token
        return headers
    }, [adminToken])

    // ============================================
    // Poll jobs from API (every 3 seconds)
    // ============================================
    const fetchJobs = useCallback(async () => {
        try {
            const res = await fetch('/api/queue/jobs', { headers: getHeaders() })
            if (res.ok) {
                const data = await res.json()
                setJobs(data.jobs || [])
            }
        } catch (err) {
            console.error('[QueuePanel] Failed to fetch jobs:', err)
        } finally {
            setIsLoading(false)
        }
    }, [getHeaders])

    useEffect(() => {
        fetchJobs()
        const interval = setInterval(fetchJobs, 3000)
        return () => clearInterval(interval)
    }, [fetchJobs])

    // ============================================
    // Load settings
    // ============================================
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/queue/settings', { headers: getHeaders() })
                if (res.ok) {
                    const data = await res.json()
                    if (data.titleSource) setTitleSource(data.titleSource)
                }
            } catch (err) {
                console.error('[QueuePanel] Failed to load settings:', err)
            }
        }
        loadSettings()
    }, [getHeaders])

    // ============================================
    // Load streamers list
    // ============================================
    useEffect(() => {
        const loadStreamers = async () => {
            try {
                const res = await fetch('/api/db', { headers: getHeaders() })
                if (res.ok) {
                    const data = await res.json()
                    if (data.streamers && Array.isArray(data.streamers)) {
                        setStreamers(data.streamers.map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            koreanName: s.koreanName,
                            profileImage: s.profileImage,
                        })))
                    }
                }
            } catch (err) {
                console.error('[QueuePanel] Failed to load streamers:', err)
            }
        }
        loadStreamers()
    }, [getHeaders])

    // ============================================
    // Save title source setting
    // ============================================
    const handleTitleSourceChange = async (value: 'pageTitle' | 'fileName') => {
        setTitleSource(value)
        try {
            await fetch('/api/queue/settings', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ titleSource: value }),
            })
        } catch (err) {
            console.error('[QueuePanel] Failed to save settings:', err)
        }
    }

    // ============================================
    // Add single URL to queue
    // ============================================
    const handleAddUrl = async () => {
        if (!urlInput.trim()) return
        setIsAdding(true)
        try {
            const selectedStreamer = streamers.find(s => s.id === selectedStreamerId)
            const res = await fetch('/api/queue/jobs', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    sourceUrl: urlInput.trim(),
                    manualTitle: manualTitle.trim() || undefined,
                    titleSource,
                    streamerId: selectedStreamerId || undefined,
                    streamerName: selectedStreamer?.name || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                alert(data.error || '추가에 실패했습니다.')
            } else {
                setUrlInput('')
                setManualTitle('')
                // Immediately refresh
                fetchJobs()
            }
        } catch (err) {
            alert('URL 추가 중 오류가 발생했습니다.')
        } finally {
            setIsAdding(false)
        }
    }

    // ============================================
    // Delete a job
    // ============================================
    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('이 항목을 삭제하시겠습니까?')) return
        try {
            await fetch(`/api/queue/jobs?id=${jobId}`, {
                method: 'DELETE',
                headers: getHeaders(),
            })
            fetchJobs()
        } catch (err) {
            alert('삭제에 실패했습니다.')
        }
    }

    // ============================================
    // Retry a failed job
    // ============================================
    const handleRetryJob = async (jobId: string) => {
        try {
            await fetch('/api/queue/update', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    jobId,
                    status: 'queued',
                    error: null,
                    progress: 0,
                }),
            })
            fetchJobs()
        } catch (err) {
            alert('재시도 설정에 실패했습니다.')
        }
    }

    // ============================================
    // Cancel a processing job
    // ============================================
    const handleCancelJob = async (jobId: string) => {
        if (!confirm('진행 중인 작업을 취소하시겠습니까?')) return
        try {
            await fetch('/api/queue/update', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    jobId,
                    status: 'failed',
                    error: '사용자에 의해 취소됨',
                    progress: 0,
                }),
            })
            fetchJobs()
        } catch (err) {
            alert('취소에 실패했습니다.')
        }
    }

    // ============================================
    // Start page collection
    // ============================================
    const handleStartCollection = async () => {
        if (startPage < 1 || endPage < startPage) {
            alert('페이지 범위를 올바르게 입력해주세요.')
            return
        }
        if (!confirm(`${startPage}~${endPage} 페이지의 영상을 수집하시겠습니까?`)) return

        setIsCollecting(true)
        setCollectionProgress('수집 준비 중...')

        try {
            const allUrls: Array<{ url: string, title: string, pageNumber: number, itemOrder: number }> = []

            for (let page = startPage; page <= endPage; page++) {
                setCollectionProgress(`페이지 ${page}/${endPage} 수집 중...`)

                try {
                    const res = await fetch(`/api/queue/scrape?page=${page}`, {
                        headers: getHeaders(),
                    })

                    if (res.ok) {
                        const data = await res.json()
                        if (data.videos && Array.isArray(data.videos)) {
                            data.videos.forEach((v: any, idx: number) => {
                                allUrls.push({
                                    url: v.url,
                                    title: v.title || '',
                                    pageNumber: page,
                                    itemOrder: idx,
                                })
                            })
                        }
                    } else {
                        console.warn(`[QueuePanel] Page ${page} scrape failed:`, await res.text())
                    }
                } catch (err) {
                    console.warn(`[QueuePanel] Error scraping page ${page}:`, err)
                }

                await new Promise(r => setTimeout(r, 500))
            }

            if (allUrls.length === 0) {
                alert('수집된 URL이 없습니다. 로그인 상태를 확인해주세요.')
                setIsCollecting(false)
                setCollectionProgress('')
                return
            }

            setCollectionProgress(`${allUrls.length}개 URL 대기열에 추가 중...`)

            const sortedUrls = uploadOrder === 'asc'
                ? allUrls.sort((a, b) => a.pageNumber - b.pageNumber || a.itemOrder - b.itemOrder)
                : allUrls.sort((a, b) => b.pageNumber - a.pageNumber || b.itemOrder - a.itemOrder)

            const selectedStreamer = streamers.find(s => s.id === selectedStreamerId)
            const res = await fetch('/api/queue/bulk-jobs', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    urls: sortedUrls,
                    titleSource,
                    uploadOrder,
                    streamerId: selectedStreamerId || undefined,
                    streamerName: selectedStreamer?.name || undefined,
                }),
            })

            const result = await res.json()
            if (res.ok) {
                setCollectionProgress(`완료! 추가: ${result.created}, 중복 건너뛰기: ${result.skipped}`)
                setTimeout(() => setCollectionProgress(''), 5000)
                fetchJobs()
            } else {
                alert(result.error || '대기열 추가에 실패했습니다.')
                setCollectionProgress('')
            }
        } catch (err) {
            console.error('[QueuePanel] Collection error:', err)
            alert('수집 중 오류가 발생했습니다.')
            setCollectionProgress('')
        } finally {
            setIsCollecting(false)
        }
    }

    // ============================================
    // Filtered jobs
    // ============================================
    const filteredJobs = statusFilter === 'all'
        ? jobs
        : jobs.filter(j => j.status === statusFilter)

    const statusCounts = {
        all: jobs.length,
        queued: jobs.filter(j => j.status === 'queued').length,
        processing: jobs.filter(j => j.status === 'processing').length,
        done: jobs.filter(j => j.status === 'done').length,
        failed: jobs.filter(j => j.status === 'failed').length,
    }

    // ============================================
    // Status badge
    // ============================================
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            done: 'bg-green-500/20 text-green-400 border-green-500/30',
            failed: 'bg-red-500/20 text-red-400 border-red-500/30',
        }
        const labels: Record<string, string> = {
            queued: '대기중',
            processing: '처리중',
            done: '완료',
            failed: '실패',
        }
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
                {labels[status] || status}
            </span>
        )
    }

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>📤</span> 영상 업로드 대기열
            </h2>

            {/* ======== Title Source Setting ======== */}
            <div className="bg-black/30 rounded-xl border border-white/10 p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>⚙️</span> 파일명 규칙 (글로벌 설정)
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                    새로 추가되는 영상의 제목을 어디서 가져올지 설정합니다.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleTitleSourceChange('pageTitle')}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${titleSource === 'pageTitle'
                            ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                            : 'border-white/10 text-text-secondary hover:border-white/20'
                            }`}
                    >
                        🌐 페이지 제목 사용
                    </button>
                    <button
                        onClick={() => handleTitleSourceChange('fileName')}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${titleSource === 'fileName'
                            ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                            : 'border-white/10 text-text-secondary hover:border-white/20'
                            }`}
                    >
                        📄 영상 파일명 사용
                    </button>
                </div>
            </div>

            {/* ======== URL Import Section ======== */}
            <div className="bg-black/30 rounded-xl border border-white/10 p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>🔗</span> URL로 영상 추가
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-text-secondary mb-1 block">영상 URL</label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://skbj.tv/video/..."
                            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-text-secondary mb-1 block">제목 (선택사항 - 비워두면 자동 감지)</label>
                        <input
                            type="text"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="영상 제목을 직접 입력 (선택)"
                            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-text-secondary mb-1 block">👤 스트리머 (선택사항 - 비워두면 URL에서 자동 감지)</label>
                        <select
                            value={selectedStreamerId}
                            onChange={(e) => setSelectedStreamerId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-accent-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                        >
                            <option value="">자동 감지 (URL에서 추출)</option>
                            {streamers.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name}{s.koreanName ? ` (${s.koreanName})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleAddUrl}
                        disabled={isAdding || !urlInput.trim()}
                        className="w-full px-4 py-2.5 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAdding ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 추가 중...</>
                        ) : (
                            <>➕ 대기열에 추가</>
                        )}
                    </button>
                </div>
            </div>

            {/* ======== Page Collection Section ======== */}
            <div className="bg-black/30 rounded-xl border border-white/10 p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>📑</span> 자동 페이지 수집
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                    지정한 페이지 범위의 영상 URL을 자동으로 수집하여 대기열에 추가합니다.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="text-sm text-text-secondary mb-1 block">시작 페이지</label>
                        <input
                            type="number"
                            min={1}
                            value={startPage}
                            onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-accent-primary focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-text-secondary mb-1 block">끝 페이지</label>
                        <input
                            type="number"
                            min={1}
                            value={endPage}
                            onChange={(e) => setEndPage(parseInt(e.target.value) || 17)}
                            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-accent-primary focus:outline-none transition-colors"
                        />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="text-sm text-text-secondary mb-1 block">업로드 순서</label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setUploadOrder('asc')}
                            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${uploadOrder === 'asc'
                                ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                                : 'border-white/10 text-text-secondary hover:border-white/20'
                                }`}
                        >
                            📅 오래된 것부터 (오름차순)
                        </button>
                        <button
                            onClick={() => setUploadOrder('desc')}
                            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${uploadOrder === 'desc'
                                ? 'border-accent-primary bg-accent-primary/20 text-accent-primary'
                                : 'border-white/10 text-text-secondary hover:border-white/20'
                                }`}
                        >
                            🔄 최신 것부터 (내림차순)
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleStartCollection}
                    disabled={isCollecting}
                    className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isCollecting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 수집 중...</>
                    ) : (
                        <>🚀 수집 시작</>
                    )}
                </button>
                {collectionProgress && (
                    <div className="mt-2 text-sm text-accent-primary font-medium text-center">
                        {collectionProgress}
                    </div>
                )}
            </div>

            {/* ======== Queue Table ======== */}
            <div className="bg-black/30 rounded-xl border border-white/10 p-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>📋</span> 대기열 현황
                </h3>

                {/* Status Filter Tabs */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    {(['all', 'queued', 'processing', 'done', 'failed'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === status
                                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                                : 'bg-white/5 text-text-secondary border border-white/10 hover:border-white/20'
                                }`}
                        >
                            {{ all: '전체', queued: '대기중', processing: '처리중', done: '완료', failed: '실패' }[status]}
                            {' '}({statusCounts[status]})
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-text-secondary">
                        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        로딩 중...
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                        {statusFilter === 'all' ? '대기열이 비어있습니다.' : '해당 상태의 항목이 없습니다.'}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="bg-black/40 rounded-lg border border-white/5 p-3 hover:border-white/10 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <StatusBadge status={job.status} />
                                            <span className="text-sm font-medium text-white truncate">
                                                {job.title || '(제목 미정)'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-secondary truncate mb-1">
                                            🔗 {job.sourceUrl}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
                                            <span>📅 {new Date(job.createdAt).toLocaleString('ko-KR')}</span>
                                            {job.streamerName && <span className="text-purple-400">👤 {job.streamerName}</span>}
                                            {job.workerId && <span>🤖 {job.workerId}</span>}
                                            {job.pageNumber !== null && <span>📄 P{job.pageNumber}</span>}
                                        </div>
                                        {/* Progress bar for processing jobs */}
                                        {job.status === 'processing' && (
                                            <div className="mt-2">
                                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${job.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-blue-400 mt-0.5">{job.progress}%</span>
                                            </div>
                                        )}
                                        {/* Error message for failed jobs */}
                                        {job.status === 'failed' && job.error && (
                                            <div className="mt-1 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                                                ❌ {job.error}
                                            </div>
                                        )}
                                        {/* B2 URL for completed jobs */}
                                        {job.status === 'done' && job.b2Url && (
                                            <div className="mt-1 text-xs text-green-400">
                                                ✅ <a href={job.b2Url} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">B2 파일 보기</a>
                                            </div>
                                        )}
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {job.status === 'processing' && (
                                            <button
                                                onClick={() => handleCancelJob(job.id)}
                                                className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors"
                                                title="취소"
                                            >
                                                ⏹️
                                            </button>
                                        )}
                                        {job.status === 'failed' && (
                                            <button
                                                onClick={() => handleRetryJob(job.id)}
                                                className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                                title="재시도"
                                            >
                                                🔄
                                            </button>
                                        )}
                                        {(job.status === 'queued' || job.status === 'failed') && (
                                            <button
                                                onClick={() => handleDeleteJob(job.id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
