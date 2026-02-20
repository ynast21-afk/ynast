'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import Image from 'next/image'
import { useStreamers } from '@/contexts/StreamerContext'
import { useAuth, getAuthToken } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { resolveContentType, isVideoFile, getAcceptedVideoExtensions } from '@/utils/mimeTypes'
import UserManagementPanel from '@/components/UserManagementPanel'
import VideoQueuePanel from '@/components/VideoQueuePanel'
import dynamic from 'next/dynamic'

const AdminDashboardCharts = dynamic(() => import('@/components/AdminDashboardCharts'), {
    ssr: false,
    loading: () => <div className="animate-pulse text-center py-10 text-text-secondary">📊 차트 로딩 중...</div>
})

const SeoBenchmarkDashboard = dynamic(() => import('@/components/SeoBenchmarkDashboard'), {
    ssr: false,
    loading: () => <div className="animate-pulse text-center py-10 text-text-secondary">🏆 벤치마크 분석 로딩 중...</div>
})

// ========================================
// 관리자 페이지 탭 정의
// ========================================
type AdminTab =
    | 'dashboard'
    | 'texts'
    | 'theme'
    | 'banner'
    | 'videos'
    | 'streamers'
    | 'users'
    | 'pricing'
    | 'navigation'
    | 'seo'
    | 'settings'
    | 'inquiries'
    | 'data'
    | 'security'
    | 'upload-queue'

const gradientOptions = [
    { value: 'from-pink-900 to-purple-900', label: '핑크-퍼플' },
    { value: 'from-blue-900 to-indigo-900', label: '블루-인디고' },
    { value: 'from-cyan-900 to-teal-900', label: '시안-틸' },
    { value: 'from-amber-900 to-orange-900', label: '앰버-오렌지' },
    { value: 'from-rose-900 to-pink-900', label: '로즈-핑크' },
    { value: 'from-violet-900 to-purple-900', label: '바이올렛-퍼플' },
    { value: 'from-emerald-900 to-green-900', label: '에메랄드-그린' },
]

const colorPresets = [
    { name: 'Neon Green', value: '#00ff88' },
    { name: 'Electric Blue', value: '#00d4ff' },
    { name: 'Hot Pink', value: '#ff0080' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#ff6b00' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Gold', value: '#fbbf24' },
    { name: 'Cyan', value: '#22d3ee' },
]


interface BatchItem {
    id: string
    file: File
    customThumbnail?: File
    title: string
    streamerId: string
    tags: string
    minStreamingLevel: string
    minDownloadLevel: string
    orientation: string
    status: 'pending' | 'uploading' | 'completed' | 'error'
    progress: number
}

// Helper for B2 SHA1
const calculateSHA1 = async (data: ArrayBuffer | Blob): Promise<string> => {
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Auto-detect streamer ID and date from video title/filename (v4.0)
// Matches both English name AND Korean name (koreanName) for streamer detection
const parseVideoTitle = (rawTitle: string, streamersList: any[]): { matchedStreamer: any | null, formattedTitle: string } => {
    // 1) Build candidate list: each streamer → multiple searchable names
    //    Sort by longest candidate name first to avoid partial matches
    type Candidate = { streamer: any; matchedName: string }
    const candidates: Candidate[] = []
    for (const s of streamersList) {
        if (s.name) candidates.push({ streamer: s, matchedName: s.name })
        if (s.koreanName) candidates.push({ streamer: s, matchedName: s.koreanName })
    }
    candidates.sort((a, b) => b.matchedName.length - a.matchedName.length)

    let matchedStreamer: any = null
    let matchedNameStr = ''
    for (const c of candidates) {
        if (rawTitle.toLowerCase().includes(c.matchedName.toLowerCase())) {
            matchedStreamer = c.streamer
            matchedNameStr = c.matchedName
            break
        }
    }

    // 2) Date detection (various patterns)
    let year = '', month = '', day = ''
    const datePatterns: [RegExp, boolean][] = [
        [/(\d{4})[-._](\d{1,2})[-._](\d{1,2})/, false],   // 2024-01-15, 2024.01.15, 2024_01_15
        [/(\d{4})(\d{2})(\d{2})/, false],                    // 20240115
        [/(\d{2})(\d{2})(\d{2})(?!\d)/, true],               // 240115 (short year)
    ]
    let dateMatch: RegExpMatchArray | null = null
    for (const [pattern, shortYr] of datePatterns) {
        const m = rawTitle.match(pattern)
        if (m) {
            const yr = shortYr ? parseInt('20' + m[1]) : parseInt(m[1])
            const mo = parseInt(m[2])
            const dy = parseInt(m[3])
            if (yr >= 2000 && yr <= 2099 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
                year = shortYr ? '20' + m[1] : m[1]
                month = m[2].padStart(2, '0')
                day = m[3].padStart(2, '0')
                dateMatch = m
                break
            }
        }
    }

    // 3) Format title if date was found: YYYY_MM_DD_StreamerName_Rest
    let formattedTitle = rawTitle
    if (year && month && day && dateMatch) {
        let rest = rawTitle
        // Remove the matched date string
        rest = rest.replace(dateMatch[0], '')
        // Remove ALL streamer names (both English and Korean, case-insensitive)
        if (matchedStreamer?.name) {
            rest = rest.replace(new RegExp(matchedStreamer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
        }
        if (matchedStreamer?.koreanName) {
            rest = rest.replace(new RegExp(matchedStreamer.koreanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
        }
        // Clean up separators and whitespace
        rest = rest.replace(/^[\s_\-.\[\]()]+|[\s_\-.\[\]()]+$/g, '').replace(/[\s_\-.]+/g, '_').replace(/_+/g, '_')

        const parts = [`${year}_${month}_${day}`]
        if (matchedStreamer?.name) parts.push(matchedStreamer.name)
        if (rest) parts.push(rest)
        formattedTitle = parts.join('_')
    }

    return { matchedStreamer, formattedTitle }
}


// fetchWithAuth is now defined inside AdminPage component to access useAuth() adminToken

export default function AdminPage() {
    console.log('--- ADMIN PAGE VERSION 2.8.3 (TOKEN HEADER FIX) ---')
    const { user, isLoading: authLoading, isAdmin, adminToken, getAdminHeaders } = useAuth()

    // Helper for authenticated fetch - uses adminToken from AuthContext or localStorage
    const fetchWithAuth = (url: string, options?: RequestInit): Promise<Response> => {
        const headers: Record<string, string> = {
            ...(options?.headers as Record<string, string> || {})
        }
        // Try all sources for admin token: React state → localStorage → sessionStorage (fallback)
        let token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null)

        // Fallback: Check sessionStorage if still no token
        if (!token && typeof window !== 'undefined') {
            const sessionToken = sessionStorage.getItem('admin_token')
            if (sessionToken) {
                console.log('[fetchWithAuth] Recovered token from sessionStorage')
                localStorage.setItem('admin_token', sessionToken)
                token = sessionToken
            }
        }

        if (token) {
            headers['x-admin-token'] = token
        }
        console.log('[fetchWithAuth v2.8.2] URL:', url, 'hasToken:', !!token, 'source:', adminToken ? 'context' : 'storage')
        return fetch(url, { ...options, headers: headers as HeadersInit })
    }
    const { streamers, videos, addStreamer, removeStreamer, addVideo, addVideoAtomic, removeVideo, importData, downloadToken, migrateToB2, isServerSynced, updateStreamer, updateVideo } = useStreamers()
    const { settings, users, stats, inquiries, updateTexts, updateTheme, updateBanner, updateAnalytics, updatePopup, updatePricing, updateNavMenu, toggleNavItem, updateSocialLinks, toggleSocialLink, updateVideoDisplay, updateUserMembership, toggleUserBan, deleteInquiry } = useSiteSettings()

    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
    const [deleteModal, setDeleteModal] = useState<{ type: 'streamer' | 'video', id: string, name: string } | null>(null)
    const [editingVideo, setEditingVideo] = useState<any | null>(null)

    // Form states
    const [newStreamer, setNewStreamer] = useState({ name: '', koreanName: '', gradient: gradientOptions[0].value })
    const [newStreamerImage, setNewStreamerImage] = useState<File | null>(null)

    // Auto-thumbnail states (v2.3.0.9)
    const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null)
    const [generatedThumbnailFile, setGeneratedThumbnailFile] = useState<File | null>(null)
    const [newVideo, setNewVideo] = useState({
        title: '',
        streamerId: '',
        duration: '',
        isVip: true,
        tags: '',
        minStreamingLevel: 'vip',
        minDownloadLevel: 'vip',
        orientation: 'horizontal' as 'horizontal' | 'vertical'
    })
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null) // Manual thumbnail upload
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    // Batch upload states (v2.5)
    const [batchItems, setBatchItems] = useState<BatchItem[]>([])
    const [batchStreamerId, setBatchStreamerId] = useState('')
    const [isBatchUploading, setIsBatchUploading] = useState(false)
    const [batchCurrentIndex, setBatchCurrentIndex] = useState(0)
    const [batchProgress, setBatchProgress] = useState(0)
    const [batchGlobalTags, setBatchGlobalTags] = useState('')

    // Backup states (v2.4.0)
    const [backups, setBackups] = useState<any[]>([])
    const [isRestoring, setIsRestoring] = useState(false)
    const [isLoadingBackups, setIsLoadingBackups] = useState(false)

    // Text edit states
    const [textEdits, setTextEdits] = useState(settings.texts)

    // Theme edit states
    const [themeEdits, setThemeEdits] = useState(settings.theme)

    // Security logs states (v2.5.0)
    const [securityLogs, setSecurityLogs] = useState<any[]>([])
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)
    const securityIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // SEO Analytics states
    const [seoAnalytics, setSeoAnalytics] = useState<any>(null)
    const [seoAnalyticsLoading, setSeoAnalyticsLoading] = useState(false)
    const [seoAnalyticsRange, setSeoAnalyticsRange] = useState(7)
    const [seoAnalyticsView, setSeoAnalyticsView] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [expandedReferrer, setExpandedReferrer] = useState<string | null>(null)
    const [seoPeriodTab, setSeoPeriodTab] = useState<'all' | 'period'>('all')

    // Video list filter/sort/search states (v3.1)
    const [videoSearch, setVideoSearch] = useState('')
    const [videoStreamerFilter, setVideoStreamerFilter] = useState('')
    const [videoSortOrder, setVideoSortOrder] = useState<'newest' | 'oldest'>('newest')
    const [videoDisplayCount, setVideoDisplayCount] = useState(6)

    // Bulk orientation change states (v3.5)
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    // Streamer search state (v3.3)
    const [streamerSearch, setStreamerSearch] = useState('')

    // Twitter/X integration states (v3.2)
    const [twitterModal, setTwitterModal] = useState<{ video: any; tweetText: string; hashtags: string; tweetTextKo?: string; hashtagsKo?: string; tweetTextEn?: string; hashtagsEn?: string; isGenerating: boolean; isPosting: boolean; posted: boolean; tweetUrl?: string; error?: string; gifUrl?: string; isGeneratingGif?: boolean; gifProgress?: number; videoClipUrl?: string; videoClipPreviewUrl?: string; isGeneratingClip?: boolean; clipProgress?: number } | null>(null)
    const [tweetHistory, setTweetHistory] = useState<string[]>([]) // videoIds that have been tweeted
    const [gifScriptLoaded, setGifScriptLoaded] = useState(false)
    const [twitterMediaType, setTwitterMediaType] = useState<'images' | 'video'>('images')
    const [twitterMentStyle, setTwitterMentStyle] = useState<'standard' | 'influencer'>('standard')
    const [twitterLang, setTwitterLang] = useState<'ko' | 'en'>('ko')

    // AI Auto-Tagging states (v3.4)
    const [isGeneratingAiTags, setIsGeneratingAiTags] = useState(false)
    const [aiTagTarget, setAiTagTarget] = useState<string | null>(null) // 'edit' | batchItemId | 'new'
    const [aiTagProgress, setAiTagProgress] = useState<string>('')

    // Extract frames from a video source (File or URL) with timeout
    const extractFramesFromVideo = async (source: File | string, frameCount: number = 6): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                video.pause()
                video.removeAttribute('src')
                video.load()
                reject(new Error('프레임 추출 타임아웃 (30초)'))
            }, 30000)

            const video = document.createElement('video')
            video.crossOrigin = 'anonymous'
            video.muted = true
            video.preload = 'auto'

            video.onloadedmetadata = async () => {
                const duration = video.duration
                if (!duration || duration <= 0) { clearTimeout(timeout); reject('Invalid video duration'); return }
                const canvas = document.createElement('canvas')
                canvas.width = Math.min(video.videoWidth, 640)
                canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth))
                const ctx = canvas.getContext('2d')!
                const frames: string[] = []
                const interval = duration / (frameCount + 1)

                const captureFrame = (time: number): Promise<string> => {
                    return new Promise((res) => {
                        video.currentTime = time
                        video.onseeked = () => {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                            res(canvas.toDataURL('image/jpeg', 0.7))
                        }
                    })
                }

                try {
                    for (let i = 1; i <= frameCount; i++) {
                        setAiTagProgress(`프레임 추출 중... (${i}/${frameCount})`)
                        const frame = await captureFrame(interval * i)
                        frames.push(frame)
                    }
                    clearTimeout(timeout)
                    resolve(frames)
                } catch (err) {
                    clearTimeout(timeout)
                    reject(err)
                } finally {
                    video.pause()
                    video.removeAttribute('src')
                    video.load()
                }
            }

            video.onerror = () => { clearTimeout(timeout); reject('Failed to load video') }

            if (typeof source === 'string') {
                video.src = source
            } else {
                video.src = URL.createObjectURL(source)
            }
        })
    }

    // Fetch image URL as base64 for AI tag analysis
    const fetchImageAsBase64 = async (url: string): Promise<string> => {
        // For B2 URLs, use proxy
        let fetchUrl = url
        const headers: Record<string, string> = {}
        if (url.includes('backblazeb2.com')) {
            fetchUrl = `/api/proxy-video?url=${encodeURIComponent(url)}`
            const token = adminToken || localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
            if (token) headers['x-admin-token'] = token
        }
        const res = await fetch(fetchUrl, { headers })
        if (!res.ok) throw new Error(`이미지 로드 실패: ${res.status}`)
        const blob = await res.blob()
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    }

    // Generate AI tags from video frames or thumbnail
    const handleGenerateAiTags = async (target: 'edit' | 'new' | string, videoSource?: File | string) => {
        if (isGeneratingAiTags) return
        setIsGeneratingAiTags(true)
        setAiTagTarget(target)
        setAiTagProgress('준비 중...')

        try {
            let images: string[] = []

            if (target === 'edit' && editingVideo) {
                // For existing videos: use thumbnail image directly (FAST - no video download needed)
                const thumbUrl = editingVideo.thumbnailUrl
                const videoUrl = editingVideo.videoUrl
                if (thumbUrl) {
                    setAiTagProgress('썸네일 이미지 로딩 중...')
                    try {
                        const thumbBase64 = await fetchImageAsBase64(thumbUrl)
                        images = [thumbBase64]
                    } catch (e) {
                        console.warn('[AI Tags] Thumbnail fetch failed, trying video:', e)
                    }
                }
                // If thumbnail failed and video URL exists, try extracting from video
                if (images.length === 0 && videoUrl) {
                    setAiTagProgress('영상 로딩 중... (시간이 걸릴 수 있음)')
                    let source: string = videoUrl
                    if (videoUrl.includes('backblazeb2.com')) {
                        const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`
                        const token = adminToken || localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
                        const proxyRes = await fetch(proxyUrl, { headers: token ? { 'x-admin-token': token } : {} })
                        if (!proxyRes.ok) throw new Error(`Proxy fetch failed: ${proxyRes.status}`)
                        const blob = await proxyRes.blob()
                        source = URL.createObjectURL(blob)
                    }
                    images = await extractFramesFromVideo(source, 2)
                }
                if (images.length === 0) {
                    throw new Error('썸네일 또는 영상 URL이 없습니다.')
                }
            } else if (target === 'new') {
                const source = videoFile || null
                if (!source) { alert('⚠️ 영상 파일이 없습니다.'); return }
                setAiTagProgress('프레임 추출 중...')
                images = await extractFramesFromVideo(source, 4)
            } else {
                // Batch item
                const item = batchItems.find(b => b.id === target)
                if (!item) { alert('⚠️ 배치 아이템을 찾을 수 없습니다.'); return }
                setAiTagProgress('프레임 추출 중...')
                images = await extractFramesFromVideo(item.file, 4)
            }

            // Call API with timeout
            setAiTagProgress('AI 분석 중...')
            const controller = new AbortController()
            const apiTimeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

            const response = await fetch('/api/admin/ai-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images }),
                signal: controller.signal
            })
            clearTimeout(apiTimeout)

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                const detail = errData.details ? ` (${errData.details.substring(0, 100)})` : ''
                throw new Error(`${errData.error || `API error: ${response.status}`}${detail}`)
            }
            const data = await response.json()
            const newTags = (data.tags || []).join(', ')

            if (target === 'edit' && editingVideo) {
                const existing = (editingVideo.tags || '').toString().trim()
                setEditingVideo((prev: any) => prev ? { ...prev, tags: existing ? `${existing}, ${newTags}` : newTags } : null)
            } else if (target === 'new') {
                setNewVideo(prev => ({ ...prev, tags: prev.tags ? `${prev.tags}, ${newTags}` : newTags }))
            } else {
                const item = batchItems.find(b => b.id === target)
                if (item) {
                    const existing = (item.tags || '').trim()
                    updateBatchItem(target, { tags: existing ? `${existing}, ${newTags}` : newTags })
                }
            }

            alert(`✅ AI 태그 ${data.tags?.length || 0}개가 생성되었습니다!`)
        } catch (error: any) {
            console.error('[AI Tags] Error:', error)
            if (error?.name === 'AbortError') {
                alert('❌ AI 태그 생성 시간이 초과되었습니다. (60초)\n다시 시도해 주세요.')
            } else {
                alert(`❌ AI 태그 생성에 실패했습니다.\n${error?.message || '알 수 없는 오류'}`)
            }
        } finally {
            setIsGeneratingAiTags(false)
            setAiTagTarget(null)
            setAiTagProgress('')
        }
    }

    // Load tweet history on mount
    useEffect(() => {
        fetch('/api/admin/twitter/post')
            .then(res => res.json())
            .then(data => {
                if (data.history) {
                    const ids = data.history.filter((h: any) => h.status === 'success').map((h: any) => h.videoId)
                    setTweetHistory(ids)
                }
            })
            .catch(() => { })
    }, [])

    // Helper: Extract frames from video URL as base64 strings (streaming, no full download)
    const extractFramesAsBase64 = async (videoSrc: string, frameCount: number = 3): Promise<string[]> => {
        return new Promise((resolve) => {
            const video = document.createElement('video')
            video.crossOrigin = 'anonymous'
            video.preload = 'metadata'
            video.muted = true
            // Set src directly - browser will stream, not download entire file
            video.src = videoSrc

            let resolved = false

            video.onloadedmetadata = () => {
                const duration = video.duration
                if (!duration || duration < 1 || resolved) {
                    if (!resolved) { resolved = true; resolve([]) }
                    return
                }

                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolved = true; resolve([]); return
                }

                // Use reasonable resolution
                const maxWidth = 1280
                canvas.width = Math.min(video.videoWidth || 640, maxWidth)
                canvas.height = Math.round(canvas.width * ((video.videoHeight || 360) / (video.videoWidth || 640)))

                const frames: string[] = []
                // Pick frames at 5%, 35%, 65% (early positions load faster)
                const timePoints = [0.05, 0.35, 0.65].slice(0, frameCount).map(p => Math.max(1, p * duration))
                let currentFrame = 0

                const captureFrame = () => {
                    if (resolved) return
                    try {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                        if (dataUrl && dataUrl.length > 100) {
                            frames.push(dataUrl)
                        }
                    } catch (e) {
                        console.warn('[Twitter] Frame capture error (CORS?):', e)
                    }
                    currentFrame++
                    if (currentFrame < timePoints.length) {
                        video.currentTime = timePoints[currentFrame]
                    } else {
                        resolved = true
                        resolve(frames)
                    }
                }

                video.onseeked = captureFrame
                video.currentTime = timePoints[0]
            }

            video.onerror = () => {
                console.warn('[Twitter] Video load error for frame extraction')
                if (!resolved) { resolved = true; resolve([]) }
            }

            // Timeout after 15 seconds
            setTimeout(() => {
                if (!resolved) {
                    console.warn('[Twitter] Frame extraction timed out')
                    resolved = true
                    resolve([])
                }
            }, 15000)
        })
    }

    const handleOpenTwitterModal = async (video: any) => {
        const streamer = streamers.find(s => s.id === video.streamerId)
        setTwitterModal({
            video,
            tweetText: '',
            hashtags: '',
            isGenerating: true,
            isPosting: false,
            posted: false
        })

        try {
            const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamer.dance'
            const res = await fetchWithAuth('/api/admin/twitter/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoTitle: video.title,
                    streamerName: streamer?.name || video.streamerName || 'Unknown',
                    streamerKoreanName: streamer?.koreanName || '',
                    tags: video.tags || [],
                    videoUrl: `${BASE_URL}/video/${video.id}`,
                    style: twitterMentStyle
                })
            })
            const data = await res.json()
            if (data.success) {
                const activeText = twitterLang === 'en' ? (data.tweetTextEn || data.tweetText) : (data.tweetTextKo || data.tweetText)
                const activeHashtags = twitterLang === 'en' ? (data.hashtagsEn || data.hashtags) : (data.hashtagsKo || data.hashtags)
                setTwitterModal(prev => prev ? { ...prev, tweetText: activeText, hashtags: activeHashtags, tweetTextKo: data.tweetTextKo, hashtagsKo: data.hashtagsKo, tweetTextEn: data.tweetTextEn, hashtagsEn: data.hashtagsEn, isGenerating: false } : null)
            } else {
                const fallbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamer.dance'}/video/${video.id}`
                setTwitterModal(prev => prev ? { ...prev, tweetText: `🔥 새 영상!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtags: '#kpop #댄스 #커버댄스 #kstreamer #dance', tweetTextKo: `🔥 새 영상!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtagsKo: '#kpop #댄스 #커버댄스 #kstreamer #dance', tweetTextEn: `🔥 New video!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtagsEn: '#kpop #dance #coverdance #kstreamer', isGenerating: false } : null)
            }
        } catch {
            const fallbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamer.dance'}/video/${video.id}`
            setTwitterModal(prev => prev ? { ...prev, tweetText: `🔥 새 영상!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtags: '#kpop #댄스 #커버댄스 #kstreamer #dance', tweetTextKo: `🔥 새 영상!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtagsKo: '#kpop #댄스 #커버댄스 #kstreamer #dance', tweetTextEn: `🔥 New video!\n💃 ${video.title}\n👉 ${fallbackUrl}`, hashtagsEn: '#kpop #dance #coverdance #kstreamer', isGenerating: false } : null)
        }
    }

    const handlePostTweet = async () => {
        if (!twitterModal || twitterModal.isPosting) return
        setTwitterModal(prev => prev ? { ...prev, isPosting: true, error: undefined } : null)

        try {
            const fullText = `${twitterModal.tweetText}\n\n${twitterModal.hashtags}`

            // Collect media based on selected media type
            const video = twitterModal.video
            let mediaUrls: string[] = []
            let mediaType = twitterMediaType
            let videoClipUrl: string | undefined = undefined

            if (twitterMediaType === 'video' && twitterModal.videoClipUrl) {
                // Video clip mode
                videoClipUrl = twitterModal.videoClipUrl
            } else {
                // Image mode (existing behavior)
                mediaType = 'images'
                if (video.previewUrls && video.previewUrls.length > 0) {
                    mediaUrls = video.previewUrls.slice(0, 3)
                } else if (video.videoUrl) {
                    // 링크 업로드 영상: previewUrls가 없으면 실시간 프레임 추출 시도
                    try {
                        console.log('[Twitter] No previewUrls, attempting streaming frame extraction...')
                        // 비디오 URL을 직접 video 요소에 설정 (전체 다운로드 없이 스트리밍)
                        const base64Frames = await extractFramesAsBase64(video.videoUrl, 3)
                        if (base64Frames.length > 0) {
                            console.log(`[Twitter] Extracted ${base64Frames.length} frames as base64`)
                            // base64 이미지를 직접 서버에 전달 (B2 업로드 생략)
                            const res = await fetchWithAuth('/api/admin/twitter/post', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    tweetText: fullText,
                                    videoId: video.id,
                                    videoTitle: video.title,
                                    streamerName: video.streamerName,
                                    base64Images: base64Frames,
                                    mediaType: 'images',
                                    videoClipUrl
                                })
                            })
                            const data = await res.json()
                            if (data.success) {
                                setTwitterModal(prev => prev ? { ...prev, isPosting: false, posted: true, tweetUrl: data.tweetUrl } : null)
                                setTweetHistory(prev => [...prev, twitterModal.video.id])
                            } else {
                                setTwitterModal(prev => prev ? { ...prev, isPosting: false, error: data.error || '트윗 게시 실패' } : null)
                            }
                            return // 이미 처리 완료
                        }
                    } catch (frameErr) {
                        console.warn('[Twitter] Frame extraction failed, falling back to thumbnail:', frameErr)
                    }
                    // 프레임 추출 실패 시 썸네일로 폴백
                    if (mediaUrls.length === 0 && video.thumbnailUrl) {
                        mediaUrls = [video.thumbnailUrl]
                    }
                } else if (video.thumbnailUrl) {
                    mediaUrls = [video.thumbnailUrl]
                }
            }

            const res = await fetchWithAuth('/api/admin/twitter/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tweetText: fullText,
                    videoId: video.id,
                    videoTitle: video.title,
                    streamerName: video.streamerName,
                    mediaUrls,
                    mediaType,
                    videoClipUrl
                })
            })
            const data = await res.json()
            if (data.success) {
                setTwitterModal(prev => prev ? { ...prev, isPosting: false, posted: true, tweetUrl: data.tweetUrl } : null)
                setTweetHistory(prev => [...prev, twitterModal.video.id])
            } else {
                setTwitterModal(prev => prev ? { ...prev, isPosting: false, error: data.error || '트윗 게시 실패' } : null)
            }
        } catch (err: any) {
            setTwitterModal(prev => prev ? { ...prev, isPosting: false, error: err.message || '네트워크 오류' } : null)
        }
    }

    // GIF Generation: Canvas frames → gif.js → B2 upload
    const handleGenerateGif = async (video: any) => {
        if (!video?.videoUrl) {
            setTwitterModal(prev => prev ? { ...prev, error: '영상 URL이 없습니다' } : null)
            return
        }

        setTwitterModal(prev => prev ? { ...prev, isGeneratingGif: true, gifProgress: 0, error: undefined } : null)

        try {
            // Fetch video as blob to avoid CORS issues with B2
            const videoRes = await fetchWithAuth(`/api/proxy-video?url=${encodeURIComponent(video.videoUrl)}`)
            if (!videoRes.ok) throw new Error('영상을 다운로드할 수 없습니다')
            const videoBlob = await videoRes.blob()
            const blobUrl = URL.createObjectURL(videoBlob)

            // Create hidden video element
            const videoEl = document.createElement('video')
            videoEl.muted = true
            videoEl.playsInline = true
            videoEl.preload = 'auto'
            videoEl.src = blobUrl

            await new Promise<void>((resolve, reject) => {
                videoEl.onloadeddata = () => resolve()
                videoEl.onerror = () => reject(new Error('영상을 로드할 수 없습니다'))
                setTimeout(() => reject(new Error('영상 로드 시간 초과')), 30000)
            })

            const width = 480
            const height = Math.round((videoEl.videoHeight / videoEl.videoWidth) * width) || 270
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!

            // Check if gif.js is loaded
            const GIFConstructor = (window as any).GIF
            if (!GIFConstructor) {
                throw new Error('GIF 라이브러리가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.')
            }

            const gif = new GIFConstructor({
                workers: 2,
                quality: 10,
                width,
                height,
                workerScript: '/lib/gif.worker.js'
            })

            // Capture 15 frames from first 3 seconds (5fps)
            const totalFrames = 15
            const duration = Math.min(3, videoEl.duration)
            const frameInterval = duration / totalFrames

            for (let i = 0; i < totalFrames; i++) {
                videoEl.currentTime = i * frameInterval
                await new Promise<void>(resolve => {
                    videoEl.onseeked = () => resolve()
                })
                ctx.drawImage(videoEl, 0, 0, width, height)
                gif.addFrame(ctx, { copy: true, delay: 200 }) // 200ms per frame = 5fps
                setTwitterModal(prev => prev ? { ...prev, gifProgress: Math.round(((i + 1) / totalFrames) * 50) } : null)
            }

            // Render GIF
            const gifBlob: Blob = await new Promise((resolve, reject) => {
                gif.on('finished', (blob: Blob) => resolve(blob))
                gif.on('error', (err: any) => reject(err))
                gif.render()
            })

            setTwitterModal(prev => prev ? { ...prev, gifProgress: 70 } : null)

            // Upload to B2 via API
            const formData = new FormData()
            formData.append('file', gifBlob, `${video.id}.gif`)
            formData.append('videoId', video.id)
            formData.append('fileType', 'image/gif')

            const uploadRes = await fetchWithAuth('/api/admin/twitter/upload-preview', {
                method: 'POST',
                body: formData
            })
            const uploadData = await uploadRes.json()

            if (uploadData.success) {
                setTwitterModal(prev => prev ? { ...prev, isGeneratingGif: false, gifUrl: uploadData.previewUrl, gifProgress: 100 } : null)
            } else {
                throw new Error(uploadData.error || 'GIF 업로드 실패')
            }

            // Cleanup
            URL.revokeObjectURL(blobUrl)
            videoEl.remove()
        } catch (err: any) {
            console.error('GIF generation error:', err)
            setTwitterModal(prev => prev ? { ...prev, isGeneratingGif: false, gifProgress: 0, error: `GIF 생성 실패: ${err.message}` } : null)
        }
    }

    // Video Clip Preparation: fetch original MP4 for preview and use original B2 URL for Twitter upload
    const handleGenerateVideoClip = async (video: any) => {
        if (!video?.videoUrl) {
            setTwitterModal(prev => prev ? { ...prev, error: '영상 URL이 없습니다' } : null)
            return
        }

        setTwitterModal(prev => prev ? { ...prev, isGeneratingClip: true, clipProgress: 0, error: undefined } : null)

        try {
            // Fetch video as blob for local preview (avoids CORS/B2 auth issues)
            setTwitterModal(prev => prev ? { ...prev, clipProgress: 20 } : null)
            const videoRes = await fetchWithAuth(`/api/proxy-video?url=${encodeURIComponent(video.videoUrl)}`)
            if (!videoRes.ok) throw new Error('영상을 다운로드할 수 없습니다')
            setTwitterModal(prev => prev ? { ...prev, clipProgress: 60 } : null)
            const videoBlob = await videoRes.blob()
            const blobUrl = URL.createObjectURL(videoBlob)

            setTwitterModal(prev => prev ? { ...prev, clipProgress: 90 } : null)
            console.log(`Video prepared: ${videoBlob.size} bytes, type: ${videoBlob.type}`)

            // Use blob URL for preview, original B2 URL for Twitter posting
            // The Twitter post API handles B2 auth and downloads the original MP4 directly
            setTwitterModal(prev => prev ? {
                ...prev,
                isGeneratingClip: false,
                videoClipUrl: video.videoUrl,  // Original B2 URL for Twitter API
                videoClipPreviewUrl: blobUrl,   // Blob URL for local preview
                clipProgress: 100
            } : null)
        } catch (err: any) {
            console.error('Video clip preparation error:', err)
            setTwitterModal(prev => prev ? { ...prev, isGeneratingClip: false, clipProgress: 0, error: `영상 준비 실패: ${err.message}` } : null)
        }
    }

    const fetchSecurityLogs = async () => {
        try {
            setIsLoadingLogs(true)
            const res = await fetch('/api/admin/logs')
            if (res.ok) {
                const data = await res.json()
                setSecurityLogs(data)
            }
        } catch (error) {
            console.error('Failed to fetch security logs', error)
        } finally {
            setIsLoadingLogs(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'security') {
            fetchSecurityLogs()
            // Auto refresh every 30 seconds while on this tab
            securityIntervalRef.current = setInterval(fetchSecurityLogs, 30000)
        } else {
            if (securityIntervalRef.current) clearInterval(securityIntervalRef.current)
        }
        return () => {
            if (securityIntervalRef.current) clearInterval(securityIntervalRef.current)
        }
    }, [activeTab])

    // Banner edit states
    const [bannerEdits, setBannerEdits] = useState(settings.banner)

    // Pricing edit states
    const [pricingEdits, setPricingEdits] = useState(settings.pricing)

    // Analytics edit states
    const [analyticsEdits, setAnalyticsEdits] = useState(settings.analytics)

    // sync with settings when they load from context (e.g. from localStorage)
    useEffect(() => {
        setTextEdits(settings.texts)
        setThemeEdits(settings.theme)
        setBannerEdits(settings.banner)
        setPricingEdits(settings.pricing)
        setAnalyticsEdits(settings.analytics)
    }, [settings])

    // notifications logic
    const [notifications, setNotifications] = useState<any[]>([])

    useEffect(() => {
        // 1. Load from localStorage cache first (instant)
        const saved = localStorage.getItem('kstreamer_admin_notifications')
        if (saved) {
            setNotifications(JSON.parse(saved).slice(0, 20))
        }

        // 2. Load from B2 server (async, overwrite with server truth)
        fetch('/api/admin/notifications')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.notifications && Array.isArray(data.notifications)) {
                    setNotifications(data.notifications.slice(0, 20))
                    localStorage.setItem('kstreamer_admin_notifications', JSON.stringify(data.notifications))
                }
            })
            .catch(err => console.error('Failed to fetch notifications from server:', err))

        if (activeTab === 'data') {
            fetchBackups()
        }
    }, [activeTab]) // Refresh when switching tabs

    const fetchBackups = async () => {
        setIsLoadingBackups(true)
        try {
            const res = await fetch('/api/admin/backup')
            if (res.ok) {
                const data = await res.json()
                // Sort by name descending (newest first)
                setBackups(data.sort((a: any, b: any) => b.fileName.localeCompare(a.fileName)))
            }
        } catch (err) {
            console.error('Failed to fetch backups:', err)
        } finally {
            setIsLoadingBackups(false)
        }
    }

    const handleRestore = async (fileName: string) => {
        if (!confirm(`[위험] 정말로 ${fileName} 백업 데이터로 복원하시겠습니까?\n현재 데이터가 모두 덮어씌워지며 복구할 수 없습니다.`)) {
            return
        }

        setIsRestoring(true)
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            })

            if (res.ok) {
                alert('데이터 복원이 완료되었습니다. 페이지가 새로고침됩니다.')
                window.location.reload()
            } else {
                const error = await res.json()
                alert(`복원 실패: ${error.error || '알 수 없는 오류'}`)
            }
        } catch (err) {
            console.error('Restore error:', err)
            alert('복원 처리 중 오류가 발생했습니다.')
        } finally {
            setIsRestoring(false)
        }
    }

    const clearNotifications = () => {
        localStorage.setItem('kstreamer_admin_notifications', '[]')
        setNotifications([])
        // Sync to B2
        fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' })
        }).catch(err => console.error('Failed to clear notifications on server:', err))
    }

    // Capture frames from video file and detect duration
    const generateThumbnail = (file: File, previewCount: number = 0): Promise<{ thumbnail: File, previews: File[], duration: string }> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.crossOrigin = 'anonymous'
            video.src = URL.createObjectURL(file)
            video.muted = true
            video.playsInline = true

            let duration = '0:00'

            const getFormattedDuration = (totalSeconds: number) => {
                if (isNaN(totalSeconds) || totalSeconds <= 0) return '0:00'
                const minutes = Math.floor(totalSeconds / 60)
                const seconds = Math.floor(totalSeconds % 60)
                return `${minutes}:${seconds.toString().padStart(2, '0')}`
            }

            video.onloadedmetadata = async () => {
                console.log('Video metadata loaded. Raw duration:', video.duration)

                let retryCount = 0
                while ((isNaN(video.duration) || video.duration === 0 || video.duration === Infinity) && retryCount < 10) {
                    await new Promise(r => setTimeout(r, 100))
                    retryCount++
                }

                duration = getFormattedDuration(video.duration)
                const vidDuration = video.duration

                const captureFrame = (time: number): Promise<Blob> => {
                    return new Promise((res, rej) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked)
                            const canvas = document.createElement('canvas')
                            canvas.width = video.videoWidth
                            canvas.height = video.videoHeight
                            const ctx = canvas.getContext('2d')
                            if (!ctx) return rej(new Error('Canvas context failed'))
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                            canvas.toBlob(blob => blob ? res(blob) : rej(new Error('Blob creation failed')), 'image/jpeg', 0.7)
                        }
                        video.addEventListener('seeked', onSeeked)
                        video.currentTime = time
                    })
                }

                try {
                    // 1. Main Thumbnail (at 10%)
                    const thumbBlob = await captureFrame(Math.max(1.0, vidDuration * 0.1))
                    const thumbnail = new File([thumbBlob], file.name.replace(/\.[^/.]+$/, "") + "_thumb.jpg", { type: 'image/jpeg' })

                    // 2. Previews (if requested)
                    const previews: File[] = []
                    if (previewCount > 0) {
                        const positions = [0.2, 0.4, 0.6, 0.8, 0.95]
                        for (let i = 0; i < previewCount; i++) {
                            const pBlob = await captureFrame(vidDuration * positions[i])
                            previews.push(new File([pBlob], `${file.name.replace(/\.[^/.]+$/, "")}_prev_${i}.jpg`, { type: 'image/jpeg' }))
                        }
                    }

                    URL.revokeObjectURL(video.src)
                    resolve({ thumbnail, previews, duration })
                } catch (err) {
                    URL.revokeObjectURL(video.src)
                    reject(err)
                }
            }

            video.onerror = (e) => {
                console.error('Video error during duration/thumb detection:', e)
                URL.revokeObjectURL(video.src)
                reject(new Error('Video loading failed for thumbnail'))
            }
        })
    }

    // Handlers
    const handleAddStreamer = async () => {
        if (!newStreamer.name.trim()) return

        let profileImageUrl = ''

        // 1. Image Upload if selected
        if (newStreamerImage) {
            try {
                const credsRes = await fetchWithAuth('/api/upload?type=upload')
                if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                const creds = await credsRes.json()

                const sha1 = await calculateSHA1(newStreamerImage)
                const fileName = `profiles/${Date.now()}_${newStreamerImage.name}`

                const uploadRes = await fetch(creds.uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': creds.authorizationToken,
                        'X-Bz-File-Name': encodeURIComponent(fileName),
                        'Content-Type': newStreamerImage.type,
                        'Content-Length': newStreamerImage.size.toString(),
                        'X-Bz-Content-Sha1': sha1,
                    },
                    body: newStreamerImage,
                })

                if (!uploadRes.ok) throw new Error('Profile Image Upload failed')
                profileImageUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                console.log('Profile image uploaded:', profileImageUrl)
            } catch (error) {
                console.error('Failed to upload profile image:', error)
                alert('이미지 업로드에 실패했습니다. (텍스트 정보만 저장됩니다)')
            }
        }

        // 2. Add Streamer (Random gradient fallback)
        const randomGradient = gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value

        await addStreamer({
            name: newStreamer.name.trim(),
            koreanName: newStreamer.koreanName.trim() || undefined,
            gradient: newStreamer.gradient,
            profileImage: profileImageUrl || undefined,
        })
        setNewStreamer({ name: '', koreanName: '', gradient: gradientOptions[0].value })
        setNewStreamerImage(null)

        // Reset file input
        const fileInput = document.getElementById('streamer-profile-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        alert('✅ 스트리머가 추가되었습니다!')
    }

    const handleAddVideo = async () => {
        // Allow empty title if file is selected (will default to filename)
        if ((!newVideo.title.trim() && !videoFile) || !newVideo.streamerId) {
            alert('영상 제목(또는 파일)과 스트리머를 입력해주세요.')
            return
        }

        const streamer = streamers.find(s => s.id === newVideo.streamerId)
        if (!streamer) return

        setIsUploading(true)
        setUploadProgress(0)
        let videoUrl = ''
        let thumbnailUrl = ''
        let detectedDuration = '0:00'

        // 파일이 선택된 경우 업로드 진행
        if (videoFile) {
            // 1. Determine final thumbnail source
            let finalThumbFile: File | null = null
            let previewFiles: File[] = []

            if (thumbnailFile) {
                console.log('Using manually uploaded thumbnail')
                finalThumbFile = thumbnailFile
                // We still need duration and previews from the video
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    detectedDuration = result.duration || '0:00'
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Thumbnail/preview extraction failed, continuing without:', thumbErr)
                }
            } else if (generatedThumbnailFile) {
                console.log('Using pre-generated thumbnail')
                finalThumbFile = generatedThumbnailFile
                detectedDuration = newVideo.duration || '0:00'
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Preview extraction failed, continuing without:', thumbErr)
                }
            } else {
                console.log('Generating thumbnail and previews on-the-fly...')
                try {
                    const result = await generateThumbnail(videoFile, 5)
                    finalThumbFile = result.thumbnail
                    detectedDuration = result.duration
                    previewFiles = result.previews
                } catch (thumbErr) {
                    console.warn('Auto thumbnail/preview generation failed, continuing without:', thumbErr)
                }
            }

            setUploadProgress(1)

            const previewUrls: string[] = []

            try {
                // 1. 썸네일 및 미리보기 업로드 (Client-side Capture)
                try {
                    const credsRes = await fetchWithAuth('/api/upload?type=upload')
                    if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                    const creds = await credsRes.json()

                    // Upload Main Thumbnail
                    if (finalThumbFile) {
                        const thumbSha1 = await calculateSHA1(finalThumbFile)
                        const thumbFileName = `thumbnails/${Date.now()}_${finalThumbFile.name}`

                        const uploadRes = await fetch(creds.uploadUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': creds.authorizationToken,
                                'X-Bz-File-Name': encodeURIComponent(thumbFileName),
                                'Content-Type': resolveContentType(finalThumbFile.name, finalThumbFile.type),
                                'Content-Length': finalThumbFile.size.toString(),
                                'X-Bz-Content-Sha1': thumbSha1,
                            },
                            body: finalThumbFile,
                        })

                        if (uploadRes.ok) {
                            thumbnailUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${thumbFileName}`
                        }
                    }

                    // Upload Previews
                    for (let i = 0; i < previewFiles.length; i++) {
                        const pFile = previewFiles[i]
                        const pSha1 = await calculateSHA1(pFile)
                        const pFileName = `previews/${Date.now()}_${pFile.name}`

                        const pUploadRes = await fetch(creds.uploadUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': creds.authorizationToken,
                                'X-Bz-File-Name': encodeURIComponent(pFileName),
                                'Content-Type': resolveContentType(pFile.name, pFile.type),
                                'Content-Length': pFile.size.toString(),
                                'X-Bz-Content-Sha1': pSha1,
                            },
                            body: pFile,
                        })

                        if (pUploadRes.ok) {
                            previewUrls.push(`${creds.downloadUrl}/file/${creds.bucketName}/${pFileName}`)
                        }
                    }
                } catch (err) {
                    console.error('Thumbnail/Preview upload failed:', err)
                }

                const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB
                const isLargeFile = videoFile.size > 5 * 1024 * 1024 // 5MB

                if (isLargeFile) {
                    console.log('Initiating Multi-part upload...')
                    const formData = new FormData()
                    formData.append('action', 'start_large_file')
                    formData.append('fileName', videoFile.name)
                    formData.append('contentType', resolveContentType(videoFile.name, videoFile.type))

                    const startRes = await fetchWithAuth('/api/upload', { method: 'POST', body: formData })
                    if (!startRes.ok) {
                        const err = await startRes.text()
                        console.error('Start large file failed:', err)
                        throw new Error(`Failed to start large file: ${err}`)
                    }
                    const { fileId } = await startRes.json()
                    console.log('Multi-part upload started. File ID:', fileId)

                    const partSha1Array: string[] = []
                    const totalParts = Math.ceil(videoFile.size / CHUNK_SIZE)

                    for (let i = 0; i < totalParts; i++) {
                        const start = i * CHUNK_SIZE
                        const end = Math.min(start + CHUNK_SIZE, videoFile.size)
                        const chunk = videoFile.slice(start, end)
                        const chunkBuffer = await chunk.arrayBuffer()
                        const sha1 = await calculateSHA1(chunkBuffer)
                        partSha1Array.push(sha1)

                        // Get upload URL for this part
                        const partUrlRes = await fetchWithAuth(`/api/upload?type=upload_part&fileId=${fileId}`)
                        if (!partUrlRes.ok) throw new Error('Failed to get part upload URL')
                        const { uploadUrl, authorizationToken } = await partUrlRes.json()

                        console.log(`Uploading part ${i + 1}/${totalParts}...`)
                        // Upload part
                        const uploadPartRes = await fetch(uploadUrl, {
                            method: 'POST',
                            mode: 'cors',
                            headers: {
                                'Authorization': authorizationToken,
                                'X-Bz-Part-Number': (i + 1).toString(),
                                'Content-Length': chunk.size.toString(),
                                'X-Bz-Content-Sha1': sha1,
                                'Content-Type': 'application/octet-stream',
                            },
                            body: chunk,
                        })

                        if (!uploadPartRes.ok) {
                            const err = await uploadPartRes.text()
                            console.error(`Part ${i + 1} upload failed:`, err)
                            if (uploadPartRes.status === 0 || uploadPartRes.status === 403) {
                                throw new Error(`Part ${i + 1} failed. B2 CORS settings likely missing "X-Bz-Part-Number" header.`)
                            }
                            throw new Error(`Failed to upload part ${i + 1}: ${err}`)
                        }

                        console.log(`Part ${i + 1} done.`)
                        setUploadProgress(Math.floor(((i + 1) / totalParts) * 90))
                    }

                    console.log('Finishing large file...')
                    // Finish large file
                    const finishData = new FormData()
                    finishData.append('action', 'finish_large_file')
                    finishData.append('fileId', fileId)
                    finishData.append('partSha1Array', JSON.stringify(partSha1Array))

                    const finishRes = await fetchWithAuth('/api/upload', { method: 'POST', body: finishData })
                    if (!finishRes.ok) {
                        const err = await finishRes.text()
                        console.error('Finish large file failed:', err)
                        throw new Error(`Failed to finish large file: ${err}`)
                    }
                    const finishResult = await finishRes.json()
                    videoUrl = finishResult.downloadUrl
                    console.log('Multi-part upload SUCCESS.')
                } else {
                    // --- Single Direct Upload Flow ---
                    const credsRes = await fetchWithAuth('/api/upload?type=upload')
                    if (!credsRes.ok) throw new Error('Failed to get B2 credentials')
                    const creds = await credsRes.json()

                    const sha1 = await calculateSHA1(videoFile)
                    const fileName = `videos/${Date.now()}_${videoFile.name}`

                    const uploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(fileName),
                            'Content-Type': resolveContentType(videoFile.name, videoFile.type),
                            'Content-Length': videoFile.size.toString(),
                            'X-Bz-Content-Sha1': sha1,
                        },
                        body: videoFile,
                    })

                    if (!uploadRes.ok) throw new Error('B2 upload failed')
                    videoUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                }

                await addVideo({
                    title: newVideo.title.trim(),
                    streamerId: newVideo.streamerId,
                    streamerName: streamer.name,
                    duration: detectedDuration !== '0:00' ? detectedDuration : (newVideo.duration || '0:00'),
                    isVip: newVideo.isVip,
                    minStreamingLevel: newVideo.minStreamingLevel,
                    minDownloadLevel: newVideo.minDownloadLevel,
                    orientation: newVideo.orientation,
                    views: 0,
                    likes: 0,
                    uploadedAt: new Date().toISOString(),
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
                    tags: newVideo.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean),
                    gradient: '' // Set empty gradient as we are moving away from it
                } as any)

                setUploadProgress(100)
            } catch (error) {
                // ... existing catch block ...
                console.error('Upload failed:', error)
                alert('비디오 업로드에 실패했습니다. (B2 Upload Error)')
                setIsUploading(false)
                setUploadProgress(0)
                return
            }
        } else {
            // 파일 없이 추가하는 경우 (기존 로직 유지)
            await addVideo({
                title: newVideo.title.trim(),
                streamerId: newVideo.streamerId,
                streamerName: streamer.name,
                duration: newVideo.duration || '0:00',
                isVip: newVideo.isVip,
                minStreamingLevel: newVideo.minStreamingLevel,
                minDownloadLevel: newVideo.minDownloadLevel,
                orientation: newVideo.orientation,
                views: 0,
                likes: 0,
                gradient: streamer.gradient,
                uploadedAt: new Date().toISOString(),
                videoUrl: videoUrl || undefined,
                tags: newVideo.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean)
            })
        }

        setNewVideo({
            title: '',
            streamerId: '',
            duration: '',
            isVip: true,
            tags: '',
            minStreamingLevel: 'vip',
            minDownloadLevel: 'vip',
            orientation: 'horizontal'
        })
        setVideoFile(null)
        setThumbnailFile(null)
        setPreviewThumbnail(null)
        setGeneratedThumbnailFile(null)
        setIsUploading(false)
        setUploadProgress(0)

        // 파일 입력 초기화
        const fileInput = document.getElementById('video-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        alert('✅ 영상이 추가되었습니다!')
    }

    // Helper to create thumbnail from File object and detect duration (for batch upload)
    // createThumbnailFromFile unified into generateThumbnail above

    const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
        setBatchItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
    }

    const removeBatchItem = (id: string) => {
        setBatchItems(prev => prev.filter(item => item.id !== id))
    }

    const handleUpdateVideo = async () => {
        if (!editingVideo) return
        const selectedStreamer = streamers.find(s => s.id === editingVideo.streamerId)
        await updateVideo(editingVideo.id, {
            title: editingVideo.title,
            streamerId: editingVideo.streamerId,
            streamerName: selectedStreamer?.name || editingVideo.streamerName,
            minStreamingLevel: editingVideo.minStreamingLevel,
            minDownloadLevel: editingVideo.minDownloadLevel,
            isVip: editingVideo.minStreamingLevel === 'vip' || editingVideo.minStreamingLevel === 'premium',
            orientation: editingVideo.orientation || 'horizontal',
            tags: typeof editingVideo.tags === 'string' ? (editingVideo.tags as string).split(/[,\#]+/).map((t: string) => t.trim()).filter(Boolean) : editingVideo.tags
        })
        setEditingVideo(null)
    }

    const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)

        // Filter for allowed video formats (확장자 기반 - 폭넓은 지원)
        const validFiles = files.filter(file => isVideoFile(file))

        if (validFiles.length !== files.length) {
            alert(`⚠️ 일부 파일이 제외되었습니다.\n(지원 형식: MP4, WebM, MOV, AVI, MKV, WMV, FLV 등)\n\n제외된 파일: ${files.length - validFiles.length}개`)
        }

        const newItems: BatchItem[] = validFiles.map(file => {
            const rawTitle = file.name.replace(/\.[^/.]+$/, "")
            const { matchedStreamer, formattedTitle } = parseVideoTitle(rawTitle, streamers)
            return {
                id: Math.random().toString(36).substr(2, 9),
                file,
                title: formattedTitle,
                streamerId: matchedStreamer?.id || '',
                tags: '',
                minStreamingLevel: 'vip',
                minDownloadLevel: 'vip',
                orientation: 'horizontal',
                status: 'pending' as const,
                progress: 0
            }
        })
        setBatchItems(prev => [...prev, ...newItems])
        // Reset input
        e.target.value = ''
    }

    const handleBatchUpload = async () => {
        const pendingItems = batchItems.filter(item => item.status === 'pending')
        if (pendingItems.length === 0) {
            alert('업로드할 대기 항목이 없습니다.')
            return
        }

        if (!batchStreamerId && pendingItems.some(i => !i.streamerId)) {
            alert('전체 대상 스트리머를 지정하거나, 개별 항목에 스트리머를 지정해주세요.')
            return
        }

        setIsBatchUploading(true)
        setBatchCurrentIndex(0)

        for (let i = 0; i < pendingItems.length; i++) {
            setBatchCurrentIndex(i)
            const item = pendingItems[i]
            const file = item.file

            // Mark item as uploading
            setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it))

            const targetStreamerId = item.streamerId || batchStreamerId
            const streamer = streamers.find(s => s.id === targetStreamerId)
            const title = item.title || file.name.replace(/\.[^/.]+$/, "")

            let b2VideoUrl = ''
            let b2ThumbUrl = ''
            let previewUrls: string[] = []
            let finalDuration = '0:00'

            try {
                // 1. Duration extraction (always needed) & Auto-assets generation (fallback)
                let autoThumbBlob: File | null = null
                let autoPreviewFiles: File[] = []
                try {
                    const genResult = await generateThumbnail(file, 5)
                    autoThumbBlob = genResult.thumbnail
                    autoPreviewFiles = genResult.previews
                    finalDuration = genResult.duration
                } catch (thumbErr) {
                    console.warn(`[Batch] Thumbnail/preview extraction failed for ${file.name}, continuing upload without auto-thumbnail:`, thumbErr)
                }

                // 2. Determine which thumbnail to upload
                let thumbToUpload: Blob | File | null = autoThumbBlob

                if (item.customThumbnail) {
                    console.log(`[Batch] Using custom thumbnail for ${file.name}`)
                    thumbToUpload = item.customThumbnail
                }

                const credsRes = await fetchWithAuth('/api/upload?type=upload')
                const creds = await credsRes.json()

                // 3. Upload Thumbnail (if available)
                if (thumbToUpload) {
                    const thumbExt = item.customThumbnail ? item.customThumbnail.name.split('.').pop() : 'jpg'
                    const thumbContentType = item.customThumbnail ? item.customThumbnail.type : 'image/jpeg'
                    const thumbSha1 = await calculateSHA1(thumbToUpload)
                    const thumbName = `thumbnails/${Date.now()}_${file.name.substring(0, file.name.lastIndexOf('.')) || 'video'}.${thumbExt}`

                    const thumbUploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(thumbName),
                            'Content-Type': item.customThumbnail ? resolveContentType(item.customThumbnail.name, item.customThumbnail.type) : 'image/jpeg',
                            'Content-Length': thumbToUpload.size.toString(),
                            'X-Bz-Content-Sha1': thumbSha1,
                        },
                        body: thumbToUpload,
                    })

                    if (thumbUploadRes.ok) {
                        b2ThumbUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${thumbName}`
                    }
                }

                // 4. Upload Previews
                for (let j = 0; j < autoPreviewFiles.length; j++) {
                    const pFile = autoPreviewFiles[j]
                    const pSha1 = await calculateSHA1(pFile)
                    const pFileName = `previews/${Date.now()}_${pFile.name}`

                    const pUploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(pFileName),
                            'Content-Type': resolveContentType(pFile.name, pFile.type),
                            'Content-Length': pFile.size.toString(),
                            'X-Bz-Content-Sha1': pSha1,
                        },
                        body: pFile,
                    })

                    if (pUploadRes.ok) {
                        previewUrls.push(`${creds.downloadUrl}/file/${creds.bucketName}/${pFileName}`)
                    }
                }

                const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB
                const isLargeFile = file.size > 5 * 1024 * 1024 // 5MB

                if (isLargeFile) {
                    // --- Multi-part Upload Flow ---
                    const formData = new FormData()
                    formData.append('action', 'start_large_file')
                    formData.append('fileName', file.name)
                    formData.append('contentType', resolveContentType(file.name, file.type))

                    const startRes = await fetchWithAuth('/api/upload', { method: 'POST', body: formData })
                    if (!startRes.ok) throw new Error('Failed to start large file')
                    const { fileId } = await startRes.json()

                    const partSha1Array: string[] = []
                    const totalParts = Math.ceil(file.size / CHUNK_SIZE)

                    for (let j = 0; j < totalParts; j++) {
                        const start = j * CHUNK_SIZE
                        const end = Math.min(start + CHUNK_SIZE, file.size)
                        const chunk = file.slice(start, end)
                        const chunkBuffer = await chunk.arrayBuffer()
                        const sha1 = await calculateSHA1(chunkBuffer)
                        partSha1Array.push(sha1)

                        // Retry logic for part upload (Max 3 attempts)
                        let uploaded = false
                        let lastError = null

                        for (let attempt = 1; attempt <= 3; attempt++) {
                            try {
                                const partUrlRes = await fetchWithAuth(`/api/upload?type=upload_part&fileId=${fileId}`)
                                if (!partUrlRes.ok) throw new Error('Failed to get part upload URL')
                                const { uploadUrl, authorizationToken } = await partUrlRes.json()

                                const uploadPartRes = await fetch(uploadUrl, {
                                    method: 'POST',
                                    mode: 'cors',
                                    headers: {
                                        'Authorization': authorizationToken,
                                        'X-Bz-Part-Number': (j + 1).toString(),
                                        'Content-Length': chunk.size.toString(),
                                        'X-Bz-Content-Sha1': sha1,
                                        'Content-Type': 'application/octet-stream',
                                    },
                                    body: chunk,
                                })

                                if (!uploadPartRes.ok) {
                                    // 503 or 500 errors -> Retry
                                    if (uploadPartRes.status >= 500 || uploadPartRes.status === 429) {
                                        throw new Error(`Server status ${uploadPartRes.status}`)
                                    }
                                    // 4xx errors -> Fail immediately (except 408/429)
                                    throw new Error(`Fatal upload error ${uploadPartRes.status}`)
                                }

                                uploaded = true
                                break // Success!
                            } catch (err: any) {
                                console.warn(`Part ${j + 1} upload failed (Attempt ${attempt}/3):`, err)
                                lastError = err
                                if (attempt < 3) {
                                    await new Promise(r => setTimeout(r, 1000 * attempt)) // Backoff: 1s, 2s
                                }
                            }
                        }

                        if (!uploaded) throw lastError || new Error(`Failed to upload part ${j + 1} after 3 attempts`)

                        // Progress Update (Granular)
                        const currentFileProgress = (j + 1) / totalParts
                        const totalProgress = ((i + currentFileProgress) / pendingItems.length) * 100
                        setBatchProgress(totalProgress)

                        // Item Progress
                        const itemProgress = Math.round(currentFileProgress * 100)
                        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, progress: itemProgress } : it))
                    }

                    const finishData = new FormData()
                    finishData.append('action', 'finish_large_file')
                    finishData.append('fileId', fileId)
                    finishData.append('partSha1Array', JSON.stringify(partSha1Array))

                    const finishRes = await fetchWithAuth('/api/upload', { method: 'POST', body: finishData })
                    if (!finishRes.ok) throw new Error('Failed to finish large file')
                    const finishResult = await finishRes.json()
                    b2VideoUrl = finishResult.downloadUrl
                } else {
                    const sha1 = await calculateSHA1(file)
                    const fileName = `videos/${Date.now()}_${file.name}`

                    const uploadRes = await fetch(creds.uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': creds.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(fileName),
                            'Content-Type': resolveContentType(file.name, file.type),
                            'Content-Length': file.size.toString(),
                            'X-Bz-Content-Sha1': sha1,
                        },
                        body: file,
                    })

                    if (!uploadRes.ok) throw new Error('B2 upload failed')
                    b2VideoUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                }

                // Add video to list (ATOMIC - prevents race condition in batch uploads)
                const atomicResult = await addVideoAtomic({
                    title,
                    streamerId: targetStreamerId,
                    streamerName: streamer?.name || 'Unknown',
                    duration: finalDuration,
                    videoUrl: b2VideoUrl,
                    thumbnailUrl: b2ThumbUrl,
                    previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
                    gradient: gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value,
                    uploadedAt: new Date().toLocaleDateString(),
                    isVip: item.minStreamingLevel === 'vip' || item.minStreamingLevel === 'premium',
                    minStreamingLevel: item.minStreamingLevel,
                    minDownloadLevel: item.minDownloadLevel,
                    orientation: item.orientation || 'horizontal',
                    views: 0,
                    likes: 0,
                    tags: Array.from(new Set([
                        ...(batchGlobalTags ? batchGlobalTags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean) : []),
                        ...(item.tags ? item.tags.split(/[,\#]+/).map(t => t.trim()).filter(Boolean) : [])
                    ]))
                })
                if (!atomicResult.success) throw new Error('Failed to save video to database')

                setBatchProgress(((i + 1) / pendingItems.length) * 100)
                setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', progress: 100 } : it))

            } catch (error: any) {
                const errMsg = error?.message || String(error)
                console.error(`Batch upload item failed [${file.name}]:`, errMsg, error)
                setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', progress: 0, errorMessage: errMsg } : it))
            }
        }

        setIsBatchUploading(false)
        setBatchProgress(0)
        setBatchCurrentIndex(0)

        // Show result summary with error details
        const completedCount = pendingItems.filter((_, idx) => {
            const currentItems = batchItems
            return true  // We'll check the state after
        }).length
        // Use a timeout to allow state to settle before showing alert
        setTimeout(() => {
            const currentItems = document.querySelectorAll('[data-batch-status]')
            const errorItems = batchItems.filter(it => it.status === 'error')
            const successItems = batchItems.filter(it => it.status === 'completed')
            if (errorItems.length > 0) {
                const errorDetails = errorItems.map(it => `• ${it.file.name}: ${(it as any).errorMessage || '알 수 없는 오류'}`).join('\n')
                alert(`⚠️ 업로드 결과: ${successItems.length}개 성공, ${errorItems.length}개 실패\n\n실패 상세:\n${errorDetails}`)
            } else {
                alert('✅ 일괄 업로드가 완료되었습니다!')
            }
        }, 100)
    }
    const handleConfirmDelete = async () => {
        if (!deleteModal) return

        if (deleteModal.type === 'streamer') {
            await removeStreamer(deleteModal.id)
        } else {
            // Find video to get URLs for B2 deletion
            const videoToDelete = videos.find(v => v.id === deleteModal.id)
            if (videoToDelete) {
                console.log(`[Admin] Deleting video files from B2 for: ${videoToDelete.title}`)

                // Delete video file
                if (videoToDelete.videoUrl && videoToDelete.videoUrl.includes('backblazeb2.com')) {
                    fetchWithAuth(`/api/upload?url=${encodeURIComponent(videoToDelete.videoUrl)}`, { method: 'DELETE' })
                        .catch(err => console.error('Failed to delete video from B2:', err))
                }

                // Delete thumbnail file
                if (videoToDelete.thumbnailUrl && videoToDelete.thumbnailUrl.includes('backblazeb2.com')) {
                    fetchWithAuth(`/api/upload?url=${encodeURIComponent(videoToDelete.thumbnailUrl)}`, { method: 'DELETE' })
                        .catch(err => console.error('Failed to delete thumbnail from B2:', err))
                }
            }
            await removeVideo(deleteModal.id)
        }
        setDeleteModal(null)
    }

    const handleSaveTexts = () => {
        updateTexts(textEdits)
        alert('✅ 문구가 저장되었습니다!')
    }

    const handleSaveTheme = () => {
        updateTheme(themeEdits)
        alert('✅ 테마가 저장되었습니다!')
    }

    const handleSaveBanner = () => {
        updateBanner(bannerEdits)
        alert('✅ 배너 설정이 저장되었습니다!')
    }

    const handleSavePricing = () => {
        updatePricing(pricingEdits)
        alert('✅ 가격 설정이 저장되었습니다!')
    }

    const handleSaveAnalytics = () => {
        updateAnalytics(analyticsEdits)
        alert('✅ 설정이 저장되었습니다!')
    }

    const handleExportData = () => {
        const data = {
            streamers,
            videos,
            settings,
            exportDate: new Date().toISOString()
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kdance_backup_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string)
                if (data.streamers && data.videos) {
                    const success = await importData({ streamers: data.streamers, videos: data.videos })
                    if (success) {
                        alert('✅ 데이터 가져오기가 완료되었습니다! (스트리머/비디오)')
                        window.location.reload() // Reload to ensure all contexts sync
                    } else {
                        alert('❌ 데이터 형식이 올바르지 않습니다.')
                    }
                } else {
                    alert('❌ 필수 데이터(streamers, videos)가 누락되었습니다.')
                }
            } catch (err) {
                console.error('Import failed:', err)
                alert('❌ 파일 읽기 중 오류가 발생했습니다.')
            }
        }
        reader.readAsText(file)
    }

    // 로딩 중
    if (authLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary">로딩 중...</p>
                </div>
            </div>
        )
    }

    // 로그인하지 않은 경우
    if (!user) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <span className="text-6xl mb-4 block">🔒</span>
                    <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
                    <p className="text-text-secondary mb-6">관리자 페이지에 접근하려면 먼저 로그인해주세요.</p>
                    <Link href="/login" className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                        로그인하러 가기
                    </Link>
                </div>
            </div>
        )
    }

    // 관리자가 아닌 경우
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <span className="text-6xl mb-4 block">⛔</span>
                    <h1 className="text-2xl font-bold mb-4 text-red-400">접근 권한 없음</h1>
                    <p className="text-text-secondary mb-6">관리자만 이 페이지에 접근할 수 있습니다.</p>
                    <p className="text-sm text-text-secondary mb-6">현재 로그인: <span className="text-white">{user.email}</span></p>
                    <Link href="/" className="inline-block gradient-button text-black px-8 py-3 rounded-lg font-semibold">
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        )
    }

    // 탭 목록
    const tabs: { id: AdminTab; icon: string; label: string }[] = [
        { id: 'dashboard', icon: '📊', label: '대시보드' },
        { id: 'texts', icon: '📝', label: '사이트 문구' },
        { id: 'theme', icon: '🎨', label: '테마/디자인' },
        { id: 'banner', icon: '📢', label: '배너/공지' },
        { id: 'videos', icon: '🎬', label: '영상 관리' },
        { id: 'streamers', icon: '👥', label: '스트리머' },
        { id: 'users', icon: '👤', label: '사용자' },
        { id: 'pricing', icon: '💰', label: '멤버십 가격' },
        { id: 'navigation', icon: '🔗', label: '메뉴/링크' },
        { id: 'seo', icon: '🔍', label: 'SEO/마케팅' },
        { id: 'inquiries', icon: '✉️', label: '문의 내역' },
        { id: 'data', icon: '💾', label: '데이터 백업' },
        { id: 'settings', icon: '⚙️', label: '사이트 설정' },
        { id: 'security', icon: '🛡️', label: '보안 모니터링' },
        { id: 'upload-queue', icon: '📤', label: '업로드 대기열' },
    ]

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-red-400">⚠️ 삭제 확인</h3>
                        <p className="text-text-secondary mb-6">
                            <span className="text-white font-semibold">&quot;{deleteModal.name}&quot;</span>
                            {deleteModal.type === 'streamer' ? '를 삭제하시겠습니까? 해당 스트리머의 모든 비디오도 함께 삭제됩니다.' : '를 삭제하시겠습니까?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-text-secondary hover:bg-white/5">
                                취소
                            </button>
                            <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Twitter/X Preview Modal */}
            {twitterModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="bg-bg-secondary rounded-2xl p-6 max-w-lg w-full mx-4 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-sky-400">𝕏</span> 트윗 미리보기
                            </h3>
                            <button onClick={() => setTwitterModal(null)} className="text-text-tertiary hover:text-white text-xl">✕</button>
                        </div>

                        {/* Video Info */}
                        <div className="flex items-center gap-3 mb-4 p-3 bg-bg-primary rounded-lg border border-white/5">
                            {twitterModal.video.thumbnailUrl && (
                                <img src={twitterModal.video.thumbnailUrl} alt="" className="w-16 h-10 rounded object-cover" />
                            )}
                            <div>
                                <p className="text-sm font-medium truncate">{twitterModal.video.title}</p>
                                <p className="text-xs text-text-secondary">@{twitterModal.video.streamerName}</p>
                            </div>
                        </div>

                        {twitterModal.isGenerating ? (
                            <div className="text-center py-8">
                                <div className="inline-block w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
                                <p className="text-text-secondary text-sm">AI가 게시글을 작성 중...</p>
                            </div>
                        ) : twitterModal.posted ? (
                            <div className="text-center py-6">
                                <div className="text-4xl mb-3">✅</div>
                                <p className="text-green-400 font-bold text-lg mb-2">트윗이 게시되었습니다!</p>
                                {twitterModal.tweetUrl && (
                                    <a href={twitterModal.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline text-sm">
                                        트윗 확인하기 →
                                    </a>
                                )}
                                <div className="mt-4">
                                    <button onClick={() => setTwitterModal(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                                        닫기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Ment Style Selector */}
                                <div className="mb-3">
                                    <label className="block text-xs text-text-secondary mb-2">AI 멘트 스타일</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setTwitterMentStyle('standard')
                                                if (twitterMentStyle !== 'standard') {
                                                    // 스타일 변경 시 자동 재생성
                                                    setTimeout(() => handleOpenTwitterModal(twitterModal.video), 100)
                                                }
                                            }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterMentStyle === 'standard' ? 'bg-sky-500/30 text-sky-300 border border-sky-400/50' : 'bg-white/5 text-text-tertiary border border-white/10 hover:bg-white/10'}`}
                                        >
                                            📋 기존 스타일
                                            <span className="block text-[10px] mt-0.5 opacity-70">공식 프로모션 톤</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTwitterMentStyle('influencer')
                                                if (twitterMentStyle !== 'influencer') {
                                                    // 스타일 변경 시 자동 재생성
                                                    setTimeout(() => handleOpenTwitterModal(twitterModal.video), 100)
                                                }
                                            }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterMentStyle === 'influencer' ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50' : 'bg-white/5 text-text-tertiary border border-white/10 hover:bg-white/10'}`}
                                        >
                                            🔥 인플루언서 스타일
                                            <span className="block text-[10px] mt-0.5 opacity-70">자연스러운 SNS 톤</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Language Selector */}
                                <div className="mb-3">
                                    <label className="block text-xs text-text-secondary mb-2">언어 / Language</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setTwitterLang('ko')
                                                if (twitterLang !== 'ko' && twitterModal.tweetTextKo) {
                                                    setTwitterModal(prev => prev ? { ...prev, tweetText: prev.tweetTextKo || prev.tweetText, hashtags: prev.hashtagsKo || prev.hashtags } : null)
                                                }
                                            }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterLang === 'ko' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50' : 'bg-white/5 text-text-tertiary border border-white/10 hover:bg-white/10'}`}
                                        >
                                            🇰🇷 한글
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTwitterLang('en')
                                                if (twitterLang !== 'en' && twitterModal.tweetTextEn) {
                                                    setTwitterModal(prev => prev ? { ...prev, tweetText: prev.tweetTextEn || prev.tweetText, hashtags: prev.hashtagsEn || prev.hashtags } : null)
                                                }
                                            }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterLang === 'en' ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' : 'bg-white/5 text-text-tertiary border border-white/10 hover:bg-white/10'}`}
                                        >
                                            🇺🇸 English
                                        </button>
                                    </div>
                                </div>

                                {/* Tweet Text Editor */}
                                <div className="mb-3">
                                    <label className="block text-xs text-text-secondary mb-1">게시글 내용</label>
                                    <textarea
                                        value={twitterModal.tweetText}
                                        onChange={e => setTwitterModal(prev => prev ? { ...prev, tweetText: e.target.value } : null)}
                                        rows={5}
                                        className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:border-sky-400 resize-none"
                                        placeholder="트윗 내용을 입력하세요..."
                                    />
                                </div>

                                {/* Hashtags Editor */}
                                <div className="mb-4">
                                    <label className="block text-xs text-text-secondary mb-1">해시태그</label>
                                    <input
                                        type="text"
                                        value={twitterModal.hashtags}
                                        onChange={e => setTwitterModal(prev => prev ? { ...prev, hashtags: e.target.value } : null)}
                                        className="w-full px-3 py-2 bg-bg-primary border border-white/10 rounded-lg text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:border-sky-400"
                                        placeholder="#kpop #댄스 ..."
                                    />
                                </div>

                                {/* Character Count */}
                                <div className="flex items-center justify-between mb-4 text-xs">
                                    <span className={`${(twitterModal.tweetText.length + twitterModal.hashtags.length + 2) > 280 ? 'text-red-400' : 'text-text-tertiary'}`}>
                                        {twitterModal.tweetText.length + twitterModal.hashtags.length + 2} / 280자
                                    </span>
                                    <button
                                        onClick={() => handleOpenTwitterModal(twitterModal.video)}
                                        className="text-sky-400 hover:text-sky-300 transition-colors"
                                    >
                                        🔄 AI 재생성
                                    </button>
                                </div>

                                {/* Media Type Selector */}
                                <div className="mb-4">
                                    <label className="block text-xs text-text-secondary mb-2">미디어 유형</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTwitterMediaType('images')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterMediaType === 'images' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-bg-primary text-text-tertiary border border-white/10 hover:border-white/20'}`}
                                        >
                                            🖼️ 이미지
                                        </button>
                                        <button
                                            onClick={() => setTwitterMediaType('video')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${twitterMediaType === 'video' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-bg-primary text-text-tertiary border border-white/10 hover:border-white/20'}`}
                                        >
                                            🎬 동영상
                                        </button>
                                    </div>
                                </div>

                                {/* Images Mode: GIF Preview Generator */}
                                {twitterMediaType === 'images' && (
                                    <div className="mb-4 p-3 bg-bg-primary rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-text-secondary flex items-center gap-1">
                                                🎬 GIF 미리보기 (Twitter 카드용)
                                            </label>
                                            {!twitterModal.gifUrl && !twitterModal.isGeneratingGif && (
                                                <button
                                                    onClick={() => handleGenerateGif(twitterModal.video)}
                                                    disabled={!gifScriptLoaded}
                                                    className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                                >
                                                    {gifScriptLoaded ? '🎞️ GIF 생성' : '로딩...'}
                                                </button>
                                            )}
                                        </div>
                                        {twitterModal.isGeneratingGif && (
                                            <div>
                                                <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${twitterModal.gifProgress || 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-text-tertiary text-center">
                                                    {(twitterModal.gifProgress || 0) < 50 ? '영상 프레임 캡처 중...' : (twitterModal.gifProgress || 0) < 70 ? 'GIF 인코딩 중...' : 'B2 업로드 중...'}
                                                </p>
                                            </div>
                                        )}
                                        {twitterModal.gifUrl && (
                                            <div className="space-y-2">
                                                <img src={twitterModal.gifUrl} alt="GIF Preview" className="w-full rounded-lg border border-white/10" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-green-400">✅ GIF 생성 완료</span>
                                                    <button
                                                        onClick={() => handleGenerateGif(twitterModal.video)}
                                                        className="text-xs text-purple-400 hover:text-purple-300"
                                                    >
                                                        🔄 다시 생성
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {!twitterModal.gifUrl && !twitterModal.isGeneratingGif && (
                                            <p className="text-xs text-text-tertiary">
                                                영상 앞부분 3초를 GIF로 변환합니다. 생성된 GIF는 B2에 저장되며 Twitter 카드 이미지로 사용됩니다.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Video Mode: Video Clip Generator */}
                                {twitterMediaType === 'video' && (
                                    <div className="mb-4 p-3 bg-bg-primary rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-text-secondary flex items-center gap-1">
                                                🎥 동영상 클립 (Twitter 첨부용)
                                            </label>
                                            {!twitterModal.videoClipUrl && !twitterModal.isGeneratingClip && (
                                                <button
                                                    onClick={() => handleGenerateVideoClip(twitterModal.video)}
                                                    disabled={!twitterModal.video.videoUrl}
                                                    className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                                >
                                                    🎬 클립 생성 (5초)
                                                </button>
                                            )}
                                        </div>
                                        {twitterModal.isGeneratingClip && (
                                            <div>
                                                <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${twitterModal.clipProgress || 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-text-tertiary text-center">
                                                    {(twitterModal.clipProgress || 0) < 20 ? '영상 로드 중...' : (twitterModal.clipProgress || 0) < 70 ? '클립 녹화 중...' : (twitterModal.clipProgress || 0) < 90 ? 'B2 업로드 중...' : '완료 중...'}
                                                </p>
                                            </div>
                                        )}
                                        {twitterModal.videoClipUrl && (
                                            <div className="space-y-2">
                                                <video src={twitterModal.videoClipPreviewUrl || twitterModal.videoClipUrl} controls className="w-full rounded-lg border border-white/10" style={{ maxHeight: '200px' }} />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-green-400">✅ 클립 생성 완료</span>
                                                    <button
                                                        onClick={() => handleGenerateVideoClip(twitterModal.video)}
                                                        className="text-xs text-purple-400 hover:text-purple-300"
                                                    >
                                                        🔄 다시 생성
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {!twitterModal.videoClipUrl && !twitterModal.isGeneratingClip && (
                                            <p className="text-xs text-text-tertiary">
                                                {twitterModal.video.videoUrl
                                                    ? '영상 앞부분 5초를 MP4 클립으로 캡처합니다. 생성된 클립은 B2에 저장되며 트윗에 동영상으로 첨부됩니다.'
                                                    : '⚠️ 이 영상에는 직접 재생 URL이 없어 클립을 생성할 수 없습니다. 이미지 모드를 사용하세요.'}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Error Message */}
                                {twitterModal.error && (
                                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                                        ⚠️ {twitterModal.error}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setTwitterModal(null)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-text-secondary hover:bg-white/5 transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handlePostTweet}
                                        disabled={twitterModal.isPosting || (twitterModal.tweetText.length + twitterModal.hashtags.length + 2) > 280}
                                        className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {twitterModal.isPosting ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 게시 중...</>
                                        ) : (
                                            <>𝕏 게시하기</>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* gif.js library for GIF generation */}
            <Script src="/lib/gif.js" strategy="lazyOnload" onLoad={() => setGifScriptLoaded(true)} />

            {/* Admin Header */}
            <div className="bg-bg-secondary border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-2xl font-bold text-accent-primary">kStreamer</Link>
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold">ADMIN</span>
                        </div>
                        <div className="text-sm text-text-secondary">
                            👋 {user.name}님 환영합니다
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-56 shrink-0">
                        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-3 sticky top-6">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                        ? 'bg-accent-primary/20 text-accent-primary font-semibold'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="bg-bg-secondary rounded-2xl border border-white/10 p-6">

                            {/* Storage Diagnostic Tool (Only visible in dev or for debugging) */}
                            <div className="bg-black/40 border border-blue-500/30 rounded-2xl p-6 mb-8">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <span className="text-blue-400">🔍</span> Storage Diagnostic (v1.5.0)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                                    <div className="p-3 bg-black/60 rounded-lg">
                                        <div className="text-gray-400 mb-1">Current State</div>
                                        <div className="flex justify-between">
                                            <span>Videos:</span>
                                            <span className="text-green-400 font-bold">{videos.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Streamers:</span>
                                            <span className="text-blue-400 font-bold">{streamers.length}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-black/60 rounded-lg">
                                        <div className="text-gray-400 mb-1">Browser Storage</div>
                                        <div className="flex justify-between">
                                            <span>videos count:</span>
                                            <span className="text-yellow-400 font-bold">
                                                {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('videos') || '[]').length : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>settings check:</span>
                                            <span className="text-blue-400 font-bold">
                                                {typeof window !== 'undefined' && localStorage.getItem('kstreamer_site_settings') ? 'OK' : 'MISSING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    <button
                                        onClick={() => {
                                            if (confirm('⚠️ WARNING: This will clear all videos and reset to defaults. Proceed?')) {
                                                localStorage.removeItem('videos')
                                                localStorage.removeItem('streamers')
                                                window.location.reload()
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-red-900/30 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/20 transition-all"
                                    >
                                        Reset to Defaults (Wipe)
                                    </button>
                                    <button
                                        onClick={() => {
                                            console.log('FULL STORAGE DUMP:', { ...localStorage })
                                            alert('Console에 전체 주소와 저장값이 출력되었습니다 (F12 확인)')
                                        }}
                                        className="px-3 py-1.5 bg-blue-900/30 border border-blue-500/50 text-blue-400 rounded-md hover:bg-blue-500/20 transition-all"
                                    >
                                        Log Full Dump
                                    </button>
                                </div>
                            </div>

                            {/* ========== 대시보드 탭 ========== */}
                            {activeTab === 'dashboard' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📊 대시보드</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-600/30 rounded-xl p-5 border border-blue-500/20">
                                            <p className="text-blue-300 text-sm mb-1">총 방문자</p>
                                            <p className="text-3xl font-bold">{stats.totalVisits.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-900/50 to-green-600/30 rounded-xl p-5 border border-green-500/20">
                                            <p className="text-green-300 text-sm mb-1">오늘 방문</p>
                                            <p className="text-3xl font-bold">{stats.todayVisits}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-600/30 rounded-xl p-5 border border-purple-500/20">
                                            <p className="text-purple-300 text-sm mb-1">총 영상</p>
                                            <p className="text-3xl font-bold">{videos.length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-pink-900/50 to-pink-600/30 rounded-xl p-5 border border-pink-500/20">
                                            <p className="text-pink-300 text-sm mb-1">스트리머</p>
                                            <p className="text-3xl font-bold">{streamers.length}</p>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">🎬 최근 영상</h3>
                                            {videos.slice(0, 5).map(video => (
                                                <div key={video.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                                                    <span className="truncate flex-1">{video.title}</span>
                                                    <span className="text-xs text-text-secondary ml-2">{video.uploadedAt}</span>
                                                </div>
                                            ))}
                                            {videos.length === 0 && <p className="text-text-secondary text-sm">영상이 없습니다</p>}
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                            <h3 className="font-semibold mb-4">👥 인기 스트리머</h3>
                                            {streamers.sort((a, b) => b.videoCount - a.videoCount).slice(0, 5).map(s => (
                                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                                                    <span>{s.name}{s.koreanName ? ` (${s.koreanName})` : ''}</span>
                                                    <span className="text-xs text-accent-primary">{s.videoCount} videos</span>
                                                </div>
                                            ))}
                                            {streamers.length === 0 && <p className="text-text-secondary text-sm">스트리머가 없습니다</p>}
                                        </div>
                                    </div>

                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold">🔔 실시간 알림</h3>
                                            <button onClick={clearNotifications} className="text-xs text-text-secondary hover:text-accent-primary transition-colors">전체 삭제</button>
                                        </div>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <p className="text-text-secondary text-sm italic text-center py-4">새로운 알림이 없습니다.</p>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className="p-3 bg-bg-secondary rounded-lg border border-white/5 text-xs">
                                                        <div className="flex justify-between mb-1">
                                                            <span className={`font-bold ${notif.type === 'payment' ? 'text-green-400' :
                                                                notif.type === 'comment' ? 'text-blue-400' :
                                                                    'text-pink-400'
                                                                }`}>
                                                                {notif.type === 'payment' ? '💰 결제' : notif.type === 'comment' ? '💬 댓글' : '❤️ 찜'}
                                                            </span>
                                                            <span className="text-text-tertiary">{new Date(notif.time).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-white">{notif.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* ===== 통계 그래프 (B2 데이터 기반) ===== */}
                                    <AdminDashboardCharts />
                                </div>
                            )}

                            {/* ========== 사이트 문구 탭 ========== */}
                            {activeTab === 'texts' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📝 사이트 문구 편집</h1>
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">사이트 이름</label>
                                                <input
                                                    type="text"
                                                    value={textEdits.siteName}
                                                    onChange={e => setTextEdits({ ...textEdits, siteName: e.target.value })}
                                                    className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">사이트 슬로건</label>
                                                <input
                                                    type="text"
                                                    value={textEdits.siteSlogan}
                                                    onChange={e => setTextEdits({ ...textEdits, siteSlogan: e.target.value })}
                                                    className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">🏠 홈페이지</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">히어로 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.heroTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, heroTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">히어로 서브타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.heroSubtitle}
                                                        onChange={e => setTextEdits({ ...textEdits, heroSubtitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">📄 페이지별</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Videos 페이지 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.videosPageTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, videosPageTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Actors 페이지 타이틀</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.actorsPageTitle}
                                                        onChange={e => setTextEdits({ ...textEdits, actorsPageTitle: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">📋 푸터</h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">저작권 문구</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.footerCopyright}
                                                        onChange={e => setTextEdits({ ...textEdits, footerCopyright: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">푸터 설명</label>
                                                    <input
                                                        type="text"
                                                        value={textEdits.footerDescription}
                                                        onChange={e => setTextEdits({ ...textEdits, footerDescription: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleSaveTexts} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 변경사항 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 테마/디자인 탭 ========== */}
                            {activeTab === 'theme' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🎨 테마 / 디자인</h1>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm text-text-secondary mb-3">메인 테마 컬러</label>
                                            <div className="flex flex-wrap gap-3">
                                                {colorPresets.map(color => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => setThemeEdits({ ...themeEdits, primaryColor: color.value, primaryColorName: color.name })}
                                                        className={`w-12 h-12 rounded-xl border-2 transition-all ${themeEdits.primaryColor === color.value ? 'border-white scale-110' : 'border-transparent'
                                                            }`}
                                                        style={{ backgroundColor: color.value }}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={themeEdits.primaryColor}
                                                    onChange={e => setThemeEdits({ ...themeEdits, primaryColor: e.target.value, primaryColorName: 'Custom' })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer"
                                                />
                                                <span className="text-text-secondary">또는 직접 선택</span>
                                                <span className="text-white font-mono">{themeEdits.primaryColor}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <label className="block text-sm text-text-secondary mb-3">배경 스타일</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setThemeEdits({ ...themeEdits, backgroundStyle: 'solid' })}
                                                    className={`px-4 py-2 rounded-lg border ${themeEdits.backgroundStyle === 'solid' ? 'border-accent-primary bg-accent-primary/20' : 'border-white/20'}`}
                                                >
                                                    단색
                                                </button>
                                                <button
                                                    onClick={() => setThemeEdits({ ...themeEdits, backgroundStyle: 'gradient' })}
                                                    className={`px-4 py-2 rounded-lg border ${themeEdits.backgroundStyle === 'gradient' ? 'border-accent-primary bg-accent-primary/20' : 'border-white/20'}`}
                                                >
                                                    그라데이션
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">미리보기</h3>
                                            <div
                                                className="rounded-xl p-8 border border-white/10"
                                                style={{
                                                    backgroundColor: themeEdits.backgroundStyle === 'solid' ? themeEdits.backgroundColor : undefined,
                                                    backgroundImage: themeEdits.backgroundStyle === 'gradient'
                                                        ? `linear-gradient(to bottom right, ${themeEdits.gradientFrom}, ${themeEdits.gradientTo})`
                                                        : undefined
                                                }}
                                            >
                                                <p className="text-2xl font-bold mb-2" style={{ color: themeEdits.primaryColor }}>
                                                    kStreamer dance
                                                </p>
                                                <p className="text-text-secondary">테마 미리보기</p>
                                                <button className="mt-4 px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: themeEdits.primaryColor, color: '#000' }}>
                                                    버튼 예시
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={handleSaveTheme} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 테마 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 배너/공지 탭 ========== */}
                            {activeTab === 'banner' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">📢 배너 / 공지사항</h1>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <label className="text-sm text-text-secondary">상단 배너 표시</label>
                                            <button
                                                onClick={() => setBannerEdits({ ...bannerEdits, enabled: !bannerEdits.enabled })}
                                                className={`w-14 h-8 rounded-full transition-all ${bannerEdits.enabled ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                            >
                                                <div className={`w-6 h-6 bg-white rounded-full transition-all ${bannerEdits.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                            <span className={bannerEdits.enabled ? 'text-accent-primary' : 'text-text-secondary'}>
                                                {bannerEdits.enabled ? 'ON' : 'OFF'}
                                            </span>
                                        </div>

                                        {bannerEdits.enabled && (
                                            <>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">배너 메시지</label>
                                                    <input
                                                        type="text"
                                                        value={bannerEdits.message}
                                                        onChange={e => setBannerEdits({ ...bannerEdits, message: e.target.value })}
                                                        className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        placeholder="🎉 Welcome to kStreamer dance!"
                                                    />
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">링크 텍스트</label>
                                                        <input
                                                            type="text"
                                                            value={bannerEdits.linkText}
                                                            onChange={e => setBannerEdits({ ...bannerEdits, linkText: e.target.value })}
                                                            className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">링크 URL</label>
                                                        <input
                                                            type="text"
                                                            value={bannerEdits.linkUrl}
                                                            onChange={e => setBannerEdits({ ...bannerEdits, linkUrl: e.target.value })}
                                                            className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">배경색</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={bannerEdits.backgroundColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, backgroundColor: e.target.value })}
                                                                className="w-12 h-12 rounded-lg cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={bannerEdits.backgroundColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, backgroundColor: e.target.value })}
                                                                className="flex-1 px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-text-secondary mb-2">텍스트색</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={bannerEdits.textColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, textColor: e.target.value })}
                                                                className="w-12 h-12 rounded-lg cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={bannerEdits.textColor}
                                                                onChange={e => setBannerEdits({ ...bannerEdits, textColor: e.target.value })}
                                                                className="flex-1 px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Banner Preview */}
                                                <div>
                                                    <h3 className="font-semibold mb-3">미리보기</h3>
                                                    <div
                                                        className="p-4 rounded-xl flex items-center justify-center gap-4"
                                                        style={{ backgroundColor: bannerEdits.backgroundColor, color: bannerEdits.textColor }}
                                                    >
                                                        <span>{bannerEdits.message}</span>
                                                        <span className="underline font-semibold">{bannerEdits.linkText} →</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <button onClick={handleSaveBanner} className="gradient-button text-black px-8 py-3 rounded-xl font-semibold">
                                            💾 배너 설정 저장
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== 영상 관리 탭 ========== */}
                            {activeTab === 'videos' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🎬 영상 관리 ({videos.length}개)</h1>

                                    {/* Video Display Settings */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    ⚙️ 썸네일 표시 설정
                                                </h3>
                                                <p className="text-xs text-text-tertiary mt-1">
                                                    비활성화 시 모든 등급의 사용자에게 썸네일 및 미리보기가 자물쇠 없이 공개됩니다. (영상 재생/다운로드는 등급 제한 유지)
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-text-secondary">{settings.videoDisplay?.thumbnailLockEnabled !== false ? '🔒 자물쇠 표시' : '🔓 전체 공개'}</span>
                                                <button
                                                    onClick={() => updateVideoDisplay({ thumbnailLockEnabled: !(settings.videoDisplay?.thumbnailLockEnabled !== false) })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.videoDisplay?.thumbnailLockEnabled !== false ? 'bg-accent-primary' : 'bg-white/20'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.videoDisplay?.thumbnailLockEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Batch Upload Section (Replaces Single Upload) */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6 overflow-hidden">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-accent-primary">📦 비디오 대량 업로드 (Bulk Upload)</h3>
                                            <span className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded font-mono">v3.0</span>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Global Controls */}
                                            <div className="grid md:grid-cols-2 gap-4 bg-bg-secondary/30 p-4 rounded-xl border border-white/5">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">기본 스트리머 (Batch Default)</label>
                                                    <select
                                                        value={batchStreamerId}
                                                        onChange={e => setBatchStreamerId(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    >
                                                        <option value="">(선택 안함 - 개별 지정)</option>
                                                        {streamers.map(s => <option key={s.id} value={s.id}>{s.koreanName ? `${s.name} (${s.koreanName})` : s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">파일 선택 (다중 선택 / 드래그)</label>
                                                    <div className="relative group">
                                                        <input
                                                            id="batch-file-input"
                                                            type="file"
                                                            accept="video/mp4,video/webm"
                                                            multiple
                                                            onChange={handleBatchFileSelect}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            disabled={isBatchUploading}
                                                        />
                                                        <div className="w-full px-4 py-3 bg-bg-secondary border border-dashed border-white/30 rounded-lg text-text-secondary text-center group-hover:border-accent-primary group-hover:text-accent-primary transition-all flex items-center justify-center gap-2">
                                                            <span className="text-xl">📂</span>
                                                            Click or Drag files here (MP4, WebM)
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selected Files Queue */}
                                            {batchItems.length > 0 && (
                                                <div className="bg-bg-secondary rounded-lg p-4 border border-white/5">
                                                    <div className="flex justify-between items-center mb-3 text-sm">
                                                        <span className="text-text-secondary">대기열: <span className="text-white font-bold">{batchItems.length}</span>개 파일</span>
                                                        {isBatchUploading && <span className="text-accent-primary animate-pulse font-bold">🚀 업로드 진행 중...</span>}
                                                    </div>

                                                    {/* Bulk Orientation Change for Batch Items */}
                                                    {batchItems.filter(i => i.status === 'pending').length > 1 && !isBatchUploading && (
                                                        <div className="flex items-center gap-2 mb-3 p-2 bg-black/20 rounded-lg border border-white/5">
                                                            <span className="text-xs text-text-tertiary mr-1">일괄 방향:</span>
                                                            <button
                                                                onClick={() => setBatchItems(prev => prev.map(item => item.status === 'pending' ? { ...item, orientation: 'horizontal' } : item))}
                                                                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30"
                                                            >
                                                                📺 전체 가로
                                                            </button>
                                                            <button
                                                                onClick={() => setBatchItems(prev => prev.map(item => item.status === 'pending' ? { ...item, orientation: 'vertical' } : item))}
                                                                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                                                            >
                                                                📱 전체 세로
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                                        {batchItems.map((item) => (
                                                            <div key={item.id} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${item.status === 'error' ? 'border-red-500/50 bg-red-500/10' : item.status === 'completed' ? 'border-green-500/50 bg-green-500/10' : item.status === 'uploading' ? 'border-accent-primary/50 bg-accent-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>

                                                                <div className="flex items-start justify-between gap-4">
                                                                    {/* File Info */}
                                                                    <div className="w-1/3 min-w-[200px]">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-lg">🎬</span>
                                                                            <span className="text-sm font-medium text-white truncate" title={item.file.name}>{item.file.name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                                                                            <span>{(item.file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                                                            <span>•</span>
                                                                            <span className="uppercase">{item.file.name.split('.').pop()?.toUpperCase() || 'VIDEO'}</span>
                                                                        </div>
                                                                        {item.status === 'completed' && <div className="mt-2 text-green-400 text-xs font-bold">✅ 업로드 완료</div>}
                                                                        {item.status === 'error' && <div className="mt-2 text-red-400 text-xs font-bold">❌ 실패</div>}
                                                                        {item.status === 'uploading' && <div className="mt-2 text-accent-primary text-xs font-bold">⏳ {item.progress}%</div>}
                                                                    </div>

                                                                    {/* Metadata Interface */}
                                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="md:col-span-2 flex items-center gap-4 bg-black/30 p-2 rounded-lg border border-white/5">
                                                                            <div className="relative w-16 h-16 bg-bg-secondary rounded overflow-hidden flex-shrink-0 border border-white/10 group">
                                                                                {item.customThumbnail ? (
                                                                                    <img
                                                                                        src={URL.createObjectURL(item.customThumbnail)}
                                                                                        alt="Preview"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-text-tertiary">
                                                                                        <span>Auto</span>
                                                                                        <span>Thumb</span>
                                                                                    </div>
                                                                                )}
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0]
                                                                                        if (file) updateBatchItem(item.id, { customThumbnail: file })
                                                                                    }}
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white pointer-events-none">
                                                                                    Change
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <label className="block text-[10px] text-text-tertiary mb-1">수동 썸네일 (선택 사항)</label>
                                                                                <div className="text-[11px] text-text-secondary leading-tight">
                                                                                    {item.customThumbnail ? (
                                                                                        <span className="text-accent-primary font-medium">{item.customThumbnail.name}</span>
                                                                                    ) : (
                                                                                        "영상의 첫 프레임이 자동으로 추출됩니다."
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {item.customThumbnail && (
                                                                                <button
                                                                                    onClick={() => updateBatchItem(item.id, { customThumbnail: undefined })}
                                                                                    className="text-xs text-red-400 hover:text-red-300 px-2"
                                                                                >
                                                                                    취소
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">비디오 제목 (미입력 시 파일명)</label>
                                                                            <input
                                                                                type="text"
                                                                                value={item.title}
                                                                                onChange={(e) => updateBatchItem(item.id, { title: e.target.value })}
                                                                                placeholder={item.file.name.replace(/\.[^/.]+$/, "")}
                                                                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-accent-primary outline-none placeholder:text-gray-600"
                                                                                disabled={item.status !== 'pending'}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">스트리머</label>
                                                                            <select
                                                                                value={item.streamerId}
                                                                                onChange={(e) => updateBatchItem(item.id, { streamerId: e.target.value })}
                                                                                className={`w-full px-3 py-2 text-sm bg-black/40 border rounded outline-none ${!item.streamerId && !batchStreamerId ? 'border-red-500/50 text-red-300' : 'border-white/10 text-white focus:border-accent-primary'}`}
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="">
                                                                                    {batchStreamerId
                                                                                        ? `(기본: ${streamers.find(s => s.id === batchStreamerId)?.name})`
                                                                                        : '⚠️ 스트리머 선택 필수'}
                                                                                </option>
                                                                                {streamers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <label className="block text-[10px] text-text-tertiary">태그 (# 또는 , 로 구분)</label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleGenerateAiTags(item.id)}
                                                                                    disabled={isGeneratingAiTags || item.status !== 'pending'}
                                                                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${isGeneratingAiTags && aiTagTarget === item.id
                                                                                        ? 'bg-purple-500/30 text-purple-300 animate-pulse cursor-wait'
                                                                                        : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                                                                        }`}
                                                                                    title="AI 태그 자동생성"
                                                                                >
                                                                                    {isGeneratingAiTags && aiTagTarget === item.id ? `⏳ ${aiTagProgress || '분석 중...'}` : '🤖 AI'}
                                                                                </button>
                                                                            </div>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="text"
                                                                                    value={item.tags}
                                                                                    placeholder="#댄스, kpop"
                                                                                    onChange={(e) => updateBatchItem(item.id, { tags: e.target.value })}
                                                                                    className="w-full pl-8 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded text-accent-primary focus:border-accent-primary outline-none placeholder:text-gray-600"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <span className="absolute left-3 top-2 text-text-tertiary">#</span>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">스트리밍 권한</label>
                                                                            <select
                                                                                value={item.minStreamingLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minStreamingLevel: e.target.value })}
                                                                                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Guest (전체)</option>
                                                                                <option value="basic">Basic</option>
                                                                                <option value="vip">VIP</option>
                                                                                <option value="premium">Premium</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">다운로드 권한</label>
                                                                            <select
                                                                                value={item.minDownloadLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minDownloadLevel: e.target.value })}
                                                                                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Guest (전체)</option>
                                                                                <option value="basic">Basic</option>
                                                                                <option value="vip">VIP</option>
                                                                                <option value="premium">Premium</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] text-text-tertiary mb-1">영상 방향</label>
                                                                            <select
                                                                                value={item.orientation}
                                                                                onChange={(e) => updateBatchItem(item.id, { orientation: e.target.value })}
                                                                                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="horizontal">📺 Horizontal</option>
                                                                                <option value="vertical">📱 Vertical</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    {/* Delete Action */}
                                                                    {item.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => removeBatchItem(item.id)}
                                                                            className="p-1 text-text-tertiary hover:text-red-400 transition-colors"
                                                                            title="목록에서 제거"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Progress Bar */}
                                                                {item.status === 'uploading' && (
                                                                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className="bg-accent-primary h-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"
                                                                            style={{ width: `${item.progress}%` }}
                                                                        ></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
                                                        <button
                                                            onClick={handleBatchUpload}
                                                            disabled={isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0}
                                                            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 transform active:scale-95 ${isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0
                                                                ? 'bg-gray-700 opacity-50 cursor-not-allowed text-gray-400'
                                                                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20'}`}
                                                        >
                                                            {isBatchUploading ? (
                                                                <>
                                                                    <span className="animate-spin text-xl">⏳</span>
                                                                    업로드 중 ({batchItems.filter(i => i.status === 'completed').length}/{batchItems.length})
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-xl">🚀</span>
                                                                    {batchItems.length}개 동영상 일괄 업로드
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Video List - Filter / Sort / Search */}
                                    {(() => {
                                        const filtered = videos
                                            .filter(v => {
                                                if (videoStreamerFilter && v.streamerId !== videoStreamerFilter) return false
                                                if (videoSearch) {
                                                    const q = videoSearch.toLowerCase()
                                                    return v.title.toLowerCase().includes(q) || (v.streamerName || '').toLowerCase().includes(q) || (v.tags || []).some(t => t.toLowerCase().includes(q))
                                                }
                                                return true
                                            })
                                            .sort((a, b) => {
                                                const da = new Date(a.createdAt || '1970-01-01').getTime()
                                                const db = new Date(b.createdAt || '1970-01-01').getTime()
                                                return videoSortOrder === 'newest' ? db - da : da - db
                                            })

                                        return (
                                            <>
                                                {/* Toolbar */}
                                                <div className="bg-bg-primary rounded-xl p-4 border border-white/10 mb-4">
                                                    <div className="flex flex-col md:flex-row gap-3">
                                                        {/* Search */}
                                                        <div className="flex-1 relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">🔍</span>
                                                            <input
                                                                type="text"
                                                                value={videoSearch}
                                                                onChange={e => { setVideoSearch(e.target.value); setVideoDisplayCount(6) }}
                                                                placeholder="영상 제목, 스트리머, 태그 검색..."
                                                                className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-white/10 rounded-lg text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                                                            />
                                                            {videoSearch && (
                                                                <button onClick={() => setVideoSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white text-xs">✕</button>
                                                            )}
                                                        </div>

                                                        {/* Streamer Filter */}
                                                        <select
                                                            value={videoStreamerFilter}
                                                            onChange={e => { setVideoStreamerFilter(e.target.value); setVideoDisplayCount(6) }}
                                                            className="px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent-primary min-w-[160px]"
                                                        >
                                                            <option value="">전체 스트리머</option>
                                                            {streamers.map(s => (
                                                                <option key={s.id} value={s.id}>{s.koreanName ? `${s.name} (${s.koreanName})` : s.name}</option>
                                                            ))}
                                                        </select>

                                                        {/* Sort Order */}
                                                        <button
                                                            onClick={() => setVideoSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                                                            className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-sm text-white hover:border-accent-primary transition-colors flex items-center gap-2 whitespace-nowrap"
                                                        >
                                                            {videoSortOrder === 'newest' ? '⬇️ 최신순' : '⬆️ 오래된순'}
                                                        </button>
                                                    </div>
                                                    {/* Result count + Select All + Bulk Actions */}
                                                    <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={filtered.length > 0 && filtered.slice(0, videoDisplayCount).every(v => selectedVideoIds.has(v.id))}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedVideoIds(new Set(filtered.slice(0, videoDisplayCount).map(v => v.id)))
                                                                        } else {
                                                                            setSelectedVideoIds(new Set())
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 rounded accent-accent-primary cursor-pointer"
                                                                />
                                                                <span className="text-xs text-text-tertiary">전체 선택</span>
                                                            </label>
                                                            <span className="text-xs text-text-tertiary">
                                                                {(videoSearch || videoStreamerFilter)
                                                                    ? `${filtered.length}개 / 전체 ${videos.length}개`
                                                                    : `전체 ${videos.length}개`
                                                                }
                                                                {selectedVideoIds.size > 0 && (
                                                                    <span className="text-accent-primary font-medium ml-1">({selectedVideoIds.size}개 선택됨)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {selectedVideoIds.size > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-text-tertiary">선택 영상 방향:</span>
                                                                <button
                                                                    disabled={isBulkUpdating}
                                                                    onClick={async () => {
                                                                        if (!confirm(`선택한 ${selectedVideoIds.size}개 영상을 가로 방향으로 변경하시겠습니까?`)) return
                                                                        setIsBulkUpdating(true)
                                                                        try {
                                                                            for (const id of selectedVideoIds) {
                                                                                const v = videos.find(vid => vid.id === id)
                                                                                if (v) await updateVideo(id, { orientation: 'horizontal' })
                                                                            }
                                                                            setSelectedVideoIds(new Set())
                                                                            alert(`✅ ${selectedVideoIds.size}개 영상이 가로 방향으로 변경되었습니다.`)
                                                                        } catch (err: any) {
                                                                            alert(`❌ 일괄 변경 실패: ${err?.message || '알 수 없는 오류'}`)
                                                                        } finally {
                                                                            setIsBulkUpdating(false)
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30 disabled:opacity-50"
                                                                >
                                                                    {isBulkUpdating ? '⏳ 변경 중...' : '📺 가로 변경'}
                                                                </button>
                                                                <button
                                                                    disabled={isBulkUpdating}
                                                                    onClick={async () => {
                                                                        if (!confirm(`선택한 ${selectedVideoIds.size}개 영상을 세로 방향으로 변경하시겠습니까?`)) return
                                                                        setIsBulkUpdating(true)
                                                                        try {
                                                                            for (const id of selectedVideoIds) {
                                                                                const v = videos.find(vid => vid.id === id)
                                                                                if (v) await updateVideo(id, { orientation: 'vertical' })
                                                                            }
                                                                            setSelectedVideoIds(new Set())
                                                                            alert(`✅ ${selectedVideoIds.size}개 영상이 세로 방향으로 변경되었습니다.`)
                                                                        } catch (err: any) {
                                                                            alert(`❌ 일괄 변경 실패: ${err?.message || '알 수 없는 오류'}`)
                                                                        } finally {
                                                                            setIsBulkUpdating(false)
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50"
                                                                >
                                                                    {isBulkUpdating ? '⏳ 변경 중...' : '📱 세로 변경'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setSelectedVideoIds(new Set())}
                                                                    className="px-2 py-1.5 text-xs text-text-tertiary hover:text-white transition-colors"
                                                                >
                                                                    선택 해제
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Video Items - Scrollable container with pagination */}
                                                <div className="max-h-[600px] overflow-y-auto rounded-xl border border-white/10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#444 #1a1a1a' }}>
                                                    <div className="space-y-2 p-2">
                                                        {filtered.slice(0, videoDisplayCount).map(video => (
                                                            <div key={video.id} className={`flex items-center justify-between p-4 bg-bg-primary rounded-xl border transition-colors ${selectedVideoIds.has(video.id) ? 'border-accent-primary/50 bg-accent-primary/5' : 'border-white/10'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedVideoIds.has(video.id)}
                                                                        onChange={(e) => {
                                                                            setSelectedVideoIds(prev => {
                                                                                const next = new Set(prev)
                                                                                if (e.target.checked) next.add(video.id)
                                                                                else next.delete(video.id)
                                                                                return next
                                                                            })
                                                                        }}
                                                                        className="w-4 h-4 rounded accent-accent-primary cursor-pointer flex-shrink-0"
                                                                    />
                                                                    <div className={`w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 relative ${!video.thumbnailUrl ? 'bg-gradient-to-br from-gray-700 to-gray-800' : ''}`}>
                                                                        {video.thumbnailUrl ? (
                                                                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30">
                                                                                No Thumb
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute bottom-1 right-1 px-1 bg-black/60 rounded text-[10px] text-white font-mono">
                                                                            {video.duration}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium">{video.title}</p>
                                                                        <p className="text-sm text-text-secondary">@{video.streamerName}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleOpenTwitterModal(video)}
                                                                        className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${tweetHistory.includes(video.id)
                                                                            ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20'
                                                                            : 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
                                                                            }`}
                                                                        title={tweetHistory.includes(video.id) ? '이미 게시됨 (다시 게시 가능)' : 'X(Twitter)에 게시'}
                                                                    >
                                                                        {tweetHistory.includes(video.id) ? '✅ X' : '𝕏 업데이트'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingVideo({ ...video, tags: (video.tags || []).join(', ') })}
                                                                        className="text-xs text-text-secondary hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                                                    >
                                                                        수정
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteModal({ type: 'video', id: video.id, name: video.title })}
                                                                        className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {filtered.length === 0 && (
                                                            <p className="text-text-secondary text-center py-8">
                                                                {(videoSearch || videoStreamerFilter) ? '🔍 검색 결과가 없습니다' : '등록된 영상이 없습니다'}
                                                            </p>
                                                        )}
                                                        {/* Load More Button */}
                                                        {videoDisplayCount < filtered.length && (
                                                            <div className="text-center py-4">
                                                                <button
                                                                    onClick={() => setVideoDisplayCount(prev => prev + 20)}
                                                                    className="px-6 py-2 bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-lg hover:bg-accent-primary/30 transition-colors text-sm font-medium"
                                                                >
                                                                    더보기 ({Math.min(20, filtered.length - videoDisplayCount)}개 더)
                                                                </button>
                                                                <p className="text-xs text-text-tertiary mt-1">
                                                                    {videoDisplayCount}개 / {filtered.length}개 표시됨
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}

                                    {/* Edit Video Modal */}
                                    {editingVideo && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md p-6 relative">
                                                <h3 className="text-lg font-bold text-white mb-4">영상 정보 수정</h3>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">제목</label>
                                                        <input
                                                            type="text"
                                                            value={editingVideo.title}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, title: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">스트리머 (카테고리)</label>
                                                        <select
                                                            value={editingVideo.streamerId}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, streamerId: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                        >
                                                            {streamers.map(s => (
                                                                <option key={s.id} value={s.id}>{s.koreanName ? `${s.name} (${s.koreanName})` : s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-xs text-text-tertiary">태그 (쉼표로 구분)</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGenerateAiTags('edit')}
                                                                disabled={isGeneratingAiTags}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${isGeneratingAiTags && aiTagTarget === 'edit'
                                                                    ? 'bg-purple-500/30 text-purple-300 animate-pulse cursor-wait'
                                                                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300'
                                                                    }`}
                                                            >
                                                                {isGeneratingAiTags && aiTagTarget === 'edit' ? `⏳ ${aiTagProgress || '분석 중...'}` : '🤖 AI 태그 자동생성'}
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={editingVideo.tags as any}
                                                            onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, tags: e.target.value } : null)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            placeholder="예: 댄스, 커버, 4K"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs text-text-tertiary mb-1">스트리밍 권한</label>
                                                            <select
                                                                value={editingVideo.minStreamingLevel}
                                                                onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, minStreamingLevel: e.target.value } : null)}
                                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            >
                                                                <option value="guest">Guest (전체)</option>
                                                                <option value="basic">Basic</option>
                                                                <option value="vip">VIP</option>
                                                                <option value="premium">Premium</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-text-tertiary mb-1">다운로드 권한</label>
                                                            <select
                                                                value={editingVideo.minDownloadLevel}
                                                                onChange={(e) => setEditingVideo((prev: any) => prev ? { ...prev, minDownloadLevel: e.target.value } : null)}
                                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-primary outline-none"
                                                            >
                                                                <option value="guest">Guest (전체)</option>
                                                                <option value="basic">Basic</option>
                                                                <option value="vip">VIP</option>
                                                                <option value="premium">Premium</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-text-tertiary mb-1">영상 방향 (Orientation)</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingVideo((prev: any) => prev ? { ...prev, orientation: 'horizontal' } : null)}
                                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${(editingVideo.orientation || 'horizontal') === 'horizontal' ? 'bg-accent-primary text-black' : 'bg-black/50 border border-white/10 text-text-secondary hover:border-white/30'}`}
                                                            >
                                                                📺 Horizontal
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingVideo((prev: any) => prev ? { ...prev, orientation: 'vertical' } : null)}
                                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${editingVideo.orientation === 'vertical' ? 'bg-purple-500 text-white' : 'bg-black/50 border border-white/10 text-text-secondary hover:border-white/30'}`}
                                                            >
                                                                📱 Vertical
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 mt-6">
                                                    <button
                                                        onClick={() => setEditingVideo(null)}
                                                        className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleUpdateVideo}
                                                        className="gradient-button text-black px-4 py-2 rounded-lg text-sm font-semibold"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Batch Upload Section */}
                                    < div className="bg-bg-primary rounded-xl p-5 border border-white/10 mt-6 overflow-hidden" >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-accent-primary">📦 비디오 일괄 업로드 (Migration)</h3>
                                            <span className="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded font-mono">B2 Bulk Mode</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">대상 스트리머 선택</label>
                                                    <select
                                                        value={batchStreamerId}
                                                        onChange={e => setBatchStreamerId(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    >
                                                        <option value="">스트리머 선택</option>
                                                        {streamers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.koreanName || s.name})</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">일괄 적용 태그 (새로 추가되는 파일에 기본 적용)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="예: kpop, dance, tutorial"
                                                        value={batchGlobalTags}
                                                        onChange={e => setBatchGlobalTags(e.target.value)}
                                                        className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                                        disabled={isBatchUploading}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-2">비디오 파일 선택 (다중 선택 가능)</label>
                                                    <div className="relative">
                                                        <input
                                                            id="batch-file-input"
                                                            type="file"
                                                            accept="video/*"
                                                            multiple
                                                            onChange={handleBatchFileSelect}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            disabled={isBatchUploading}
                                                        />
                                                        <div className="w-full px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-accent-primary text-center hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2">
                                                            <span>📂</span> 파일 선택 / 드래그 앤 드롭
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selected Files List */}
                                            {batchItems.length > 0 && (
                                                <div className="bg-bg-secondary rounded-lg p-4 border border-white/5">
                                                    <div className="flex justify-between items-center mb-3 text-sm">
                                                        <span className="text-text-secondary">대기열: <span className="text-white font-bold">{batchItems.length}</span>개 파일</span>
                                                        {isBatchUploading && <span className="text-accent-primary animate-pulse">업로드 진행 중...</span>}
                                                    </div>

                                                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                        {batchItems.map((item) => (
                                                            <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${item.status === 'error' ? 'border-red-500/30 bg-red-500/5' : item.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-white/5'}`}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex flex-col gap-1 mb-1 w-full">
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={item.title}
                                                                                    onChange={(e) => updateBatchItem(item.id, { title: e.target.value })}
                                                                                    placeholder={item.file.name}
                                                                                    className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                                <span className="text-xs text-text-tertiary whitespace-nowrap">{(item.file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                                                            </div>
                                                                            {item.status === 'completed' && <span className="text-xs text-green-400 font-bold">✓ 완료</span>}
                                                                            {item.status === 'error' && <span className="text-xs text-red-400 font-bold">FAILED</span>}
                                                                            {item.status === 'uploading' && <span className="text-xs text-accent-primary font-bold">{item.progress}%</span>}
                                                                        </div>
                                                                        <select
                                                                            value={item.streamerId || batchStreamerId}
                                                                            onChange={(e) => updateBatchItem(item.id, { streamerId: e.target.value })}
                                                                            className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none mb-1"
                                                                            disabled={item.status !== 'pending'}
                                                                        >
                                                                            <option value="">(기본값: {(() => { const bs = streamers.find(s => s.id === batchStreamerId); return bs ? (bs.koreanName ? `${bs.name} (${bs.koreanName})` : bs.name) : '선택'; })()})</option>
                                                                            {streamers.map(s => <option key={s.id} value={s.id}>{s.koreanName ? `${s.name} (${s.koreanName})` : s.name}</option>)}
                                                                        </select>
                                                                        {/* Tag Input for individual item */}
                                                                        <input
                                                                            type="text"
                                                                            value={item.tags}
                                                                            placeholder="태그 입력 (비워두면 태그 없음)"
                                                                            onChange={(e) => updateBatchItem(item.id, { tags: e.target.value })}
                                                                            className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                            disabled={item.status !== 'pending'}
                                                                        />

                                                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                                                            <select
                                                                                value={item.minStreamingLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minStreamingLevel: e.target.value })}
                                                                                className="px-2 py-1 text-[10px] bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Stream: Guest</option>
                                                                                <option value="basic">Stream: Basic</option>
                                                                                <option value="vip">Stream: VIP</option>
                                                                                <option value="premium">Stream: Premium</option>
                                                                            </select>
                                                                            <select
                                                                                value={item.minDownloadLevel}
                                                                                onChange={(e) => updateBatchItem(item.id, { minDownloadLevel: e.target.value })}
                                                                                className="px-2 py-1 text-[10px] bg-black/30 border border-white/10 rounded text-text-secondary focus:text-white focus:border-accent-primary outline-none"
                                                                                disabled={item.status !== 'pending'}
                                                                            >
                                                                                <option value="guest">Down: Guest</option>
                                                                                <option value="basic">Down: Basic</option>
                                                                                <option value="vip">Down: VIP</option>
                                                                                <option value="premium">Down: Premium</option>
                                                                            </select>
                                                                        </div>

                                                                        {/* Custom Thumbnail Input */}
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <label className="text-[10px] text-text-tertiary shrink-0">🖼️ 썸네일:</label>
                                                                            <div className="flex-1 relative">
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0]
                                                                                        if (file) updateBatchItem(item.id, { customThumbnail: file })
                                                                                    }}
                                                                                    className="w-full text-xs text-text-secondary file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                                                                    disabled={item.status !== 'pending'}
                                                                                />
                                                                            </div>
                                                                            {item.customThumbnail && (
                                                                                <button
                                                                                    onClick={() => updateBatchItem(item.id, { customThumbnail: undefined })}
                                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                                    title="썸네일 제거"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {item.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => removeBatchItem(item.id)}
                                                                            className="text-text-tertiary hover:text-red-400 p-1"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {item.status === 'uploading' && (
                                                                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                                                        <div className="bg-accent-primary h-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end mt-4">
                                                        <button
                                                            onClick={handleBatchUpload}
                                                            disabled={isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0 || !batchStreamerId}
                                                            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isBatchUploading || batchItems.filter(i => i.status === 'pending').length === 0 || !batchStreamerId ? 'bg-gray-600 opacity-50 cursor-not-allowed text-gray-400' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
                                                        >
                                                            {isBatchUploading ? '업로드 진행 중...' : '🔥 업로드 시작'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 스트리머 탭 ========== */}
                            {activeTab === 'streamers' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">👥 스트리머 관리 ({streamers.length}명)</h1>

                                    {/* Add Streamer Form */}
                                    <div className="bg-bg-primary rounded-xl p-5 border border-white/10 mb-6">
                                        <h3 className="font-semibold mb-4">➕ 새 스트리머 추가</h3>
                                        <div className="grid md:grid-cols-4 gap-4">
                                            <input
                                                type="text"
                                                placeholder="영문 이름"
                                                value={newStreamer.name}
                                                onChange={e => setNewStreamer({ ...newStreamer, name: e.target.value })}
                                                className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                            />
                                            <input
                                                type="text"
                                                placeholder="한글 이름 (선택)"
                                                value={newStreamer.koreanName}
                                                onChange={e => setNewStreamer({ ...newStreamer, koreanName: e.target.value })}
                                                className="px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-primary"
                                            />
                                            <div className="flex items-center gap-2 bg-bg-secondary border border-white/10 rounded-lg px-2 relative min-w-[200px]">
                                                <span className="text-xl shrink-0">🖼️</span>
                                                <input
                                                    id="streamer-profile-input"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => setNewStreamerImage(e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                                />
                                            </div>
                                            <button onClick={handleAddStreamer} disabled={!newStreamer.name} className="gradient-button text-black rounded-lg font-semibold whitespace-nowrap disabled:opacity-50">
                                                추가
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="bg-bg-primary rounded-xl p-4 border border-white/10 mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">🔍</span>
                                            <input
                                                type="text"
                                                placeholder="스트리머 검색 (이름 또는 한글 이름)"
                                                value={streamerSearch}
                                                onChange={e => setStreamerSearch(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
                                            />
                                            {streamerSearch && (
                                                <button
                                                    onClick={() => setStreamerSearch('')}
                                                    className="px-3 py-2 text-text-secondary hover:text-white transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Streamer List (Scrollable) */}
                                    <div className="bg-bg-primary rounded-xl p-4 border border-white/10">
                                        <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
                                            {streamers
                                                .filter(s => {
                                                    const search = streamerSearch.toLowerCase()
                                                    return s.name.toLowerCase().includes(search) || (s.koreanName && s.koreanName.includes(search))
                                                })
                                                .map(s => (
                                                    <div key={s.id} className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative w-12 h-12 rounded-full overflow-hidden group/icon cursor-pointer">
                                                                {/* Base Gradient (Always visible as fallback) */}
                                                                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />

                                                                {s.profileImage && (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={s.profileImage.includes('backblazeb2.com') && downloadToken
                                                                            ? `${s.profileImage}${s.profileImage.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
                                                                            : s.profileImage
                                                                        }
                                                                        alt={s.name}
                                                                        className="absolute inset-0 w-full h-full object-cover bg-gray-800"
                                                                        onError={(e) => {
                                                                            console.error(`Failed to load profile image for ${s.name}:`, s.profileImage);
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                )}

                                                                {/* Edit Overlay */}
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity">
                                                                    <span className="text-[10px] text-white font-bold">EDIT</span>
                                                                </div>

                                                                {/* Hidden File Input for Profile Image */}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0]
                                                                        if (!file) return

                                                                        if (confirm(`'${s.name}'의 프로필 사진을 변경하시겠습니까?`)) {
                                                                            try {
                                                                                // Reuse existing upload logic flow
                                                                                const credsRes = await fetchWithAuth('/api/upload?type=upload')
                                                                                const creds = await credsRes.json()
                                                                                const sha1 = await calculateSHA1(file)
                                                                                const fileName = `profiles/${Date.now()}_${file.name}`

                                                                                const uploadRes = await fetch(creds.uploadUrl, {
                                                                                    method: 'POST',
                                                                                    headers: {
                                                                                        'Authorization': creds.authorizationToken,
                                                                                        'X-Bz-File-Name': encodeURIComponent(fileName),
                                                                                        'Content-Type': resolveContentType(file.name, file.type),
                                                                                        'Content-Length': file.size.toString(),
                                                                                        'X-Bz-Content-Sha1': sha1,
                                                                                    },
                                                                                    body: file,
                                                                                })

                                                                                if (uploadRes.ok) {
                                                                                    const imageUrl = `${creds.downloadUrl}/file/${creds.bucketName}/${fileName}`
                                                                                    await updateStreamer(s.id, { profileImage: imageUrl })
                                                                                    alert('✅ 프로필 사진이 변경되었습니다!')
                                                                                } else {
                                                                                    throw new Error('Upload failed')
                                                                                }
                                                                            } catch (err) {
                                                                                console.error(err)
                                                                                alert('❌ 사진 업로드 실패')
                                                                            }
                                                                        }
                                                                    }}
                                                                    title="프로필 사진 변경"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium flex items-center gap-2">
                                                                    {s.name}
                                                                    {s.koreanName && <span className="text-text-secondary">({s.koreanName})</span>}
                                                                    <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded">
                                                                        Click Icon to Edit
                                                                    </span>
                                                                </p>
                                                                <p className="text-sm text-text-secondary">{s.videoCount} videos</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setDeleteModal({ type: 'streamer', id: s.id, name: s.name })}
                                                            className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                ))}
                                            {streamers.filter(s => {
                                                const search = streamerSearch.toLowerCase()
                                                return s.name.toLowerCase().includes(search) || (s.koreanName && s.koreanName.includes(search))
                                            }).length === 0 && (
                                                    <p className="text-text-secondary text-center py-8">
                                                        {streamerSearch ? '검색 결과가 없습니다' : '등록된 스트리머가 없습니다'}
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 사용자 관리 탭 (Server-side Auth) ========== */}
                            {activeTab === 'users' && (
                                <UserManagementPanel getAdminHeaders={() => {
                                    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
                                    return token ? { 'x-admin-token': token } : {} as Record<string, string>
                                }} />
                            )}

                            {/* ========== 멤버십 가격 탭 ========== */}
                            {activeTab === 'pricing' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">💰 멤버십 플랜 설정 (VIP)</h1>
                                    <div className="bg-bg-primary rounded-xl p-8 border border-white/10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-xl font-bold text-accent-primary mb-2">VIP Membership Plan</h3>
                                                <p className="text-text-secondary">단일 VIP 플랜을 구성하고 관리합니다.</p>
                                            </div>
                                            <div className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg border border-accent-primary/30">
                                                Active Plan
                                            </div>
                                        </div>

                                        <div className="space-y-6 max-w-3xl">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">플랜 이름</label>
                                                    <input
                                                        type="text"
                                                        value={pricingEdits.vip?.title || ''}
                                                        onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, title: e.target.value } })}
                                                        placeholder="예: VIP PLAN"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">설명 (짧은 소개)</label>
                                                    <input
                                                        type="text"
                                                        value={pricingEdits.vip?.description || ''}
                                                        onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, description: e.target.value } })}
                                                        placeholder="예: The ultimate K-Dance experience"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">월간 가격 ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-text-secondary">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={pricingEdits.vip?.monthlyPrice || 0}
                                                            onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, monthlyPrice: parseFloat(e.target.value) } })}
                                                            className="w-full pl-8 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono text-lg"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">연간 가격 ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-text-secondary">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={pricingEdits.vip?.yearlyPrice || 0}
                                                            onChange={e => setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, yearlyPrice: parseFloat(e.target.value) } })}
                                                            className="w-full pl-8 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono text-lg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/10 pt-6">
                                                <label className="block text-sm text-text-secondary mb-4">제공 혜택 (Features)</label>
                                                <div className="space-y-3">
                                                    {(pricingEdits.vip?.features || []).map((feature, index) => (
                                                        <div key={index} className="flex gap-3">
                                                            <input
                                                                type="text"
                                                                value={feature}
                                                                onChange={e => {
                                                                    const newFeatures = [...(pricingEdits.vip?.features || [])]
                                                                    newFeatures[index] = e.target.value
                                                                    setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                                }}
                                                                className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newFeatures = (pricingEdits.vip?.features || []).filter((_, i) => i !== index)
                                                                    setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                                }}
                                                                className="px-4 py-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20"
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newFeatures = [...(pricingEdits.vip?.features || []), 'New Feature']
                                                            setPricingEdits({ ...pricingEdits, vip: { ...pricingEdits.vip!, features: newFeatures } })
                                                        }}
                                                        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-text-secondary hover:text-white hover:border-white/40 transition-colors"
                                                    >
                                                        + 혜택 추가하기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                                            <button onClick={handleSavePricing} className="gradient-button text-black px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transform hover:-translate-y-1 transition-all">
                                                💾 변경사항 적용하기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 네비게이션/링크 탭 ========== */}
                            {activeTab === 'navigation' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🔗 메뉴 & 소셜 링크</h1>

                                    <div className="space-y-8">
                                        {/* Navigation Menu */}
                                        <div>
                                            <h3 className="font-semibold mb-4">📋 상단 메뉴</h3>
                                            <div className="space-y-2">
                                                {settings.navMenu.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => toggleNavItem(item.id)}
                                                                className={`w-10 h-6 rounded-full transition-all ${item.visible ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                                            >
                                                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${item.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                                                            </button>
                                                            <span className={item.visible ? 'text-white' : 'text-text-secondary'}>{item.label}</span>
                                                        </div>
                                                        <span className="text-sm text-text-secondary font-mono">{item.href}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        <div className="border-t border-white/10 pt-6">
                                            <h3 className="font-semibold mb-4">🌐 소셜 링크</h3>
                                            <div className="space-y-2">
                                                {settings.socialLinks.map(link => (
                                                    <div key={link.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => toggleSocialLink(link.id)}
                                                                className={`w-10 h-6 rounded-full transition-all ${link.visible ? 'bg-accent-primary' : 'bg-gray-600'}`}
                                                            >
                                                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${link.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                                                            </button>
                                                            <span className={link.visible ? 'text-white' : 'text-text-secondary'}>{link.platform}</span>
                                                        </div>
                                                        <span className="text-sm text-text-secondary truncate max-w-xs">{link.url}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== 문의 내역 탭 ========== */}
                            {activeTab === 'inquiries' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h1 className="text-2xl font-bold">✉️ 문의 내역</h1>
                                        <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm">
                                            총 {inquiries.length}건
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {inquiries.length === 0 ? (
                                            <div className="text-center py-12 bg-bg-primary rounded-xl border border-white/10">
                                                <p className="text-text-secondary">문의 내역이 없습니다.</p>
                                            </div>
                                        ) : (
                                            inquiries.map(inquiry => (
                                                <div key={inquiry.id} className="bg-bg-primary rounded-xl p-6 border border-white/10 relative group">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('정말 이 문의를 삭제하시겠습니까?')) {
                                                                deleteInquiry(inquiry.id)
                                                            }
                                                        }}
                                                        className="absolute top-6 right-6 p-2 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="삭제"
                                                    >
                                                        🗑️
                                                    </button>

                                                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">보낸 사람:</span>
                                                            <span className="font-semibold">{inquiry.name}</span>
                                                            <span className="text-text-secondary">({inquiry.email})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">날짜:</span>
                                                            <span>{new Date(inquiry.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-text-secondary">구분:</span>
                                                            <span className="px-2 py-0.5 bg-white/5 rounded text-xs">{inquiry.subject}</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-bg-secondary p-4 rounded-lg border border-white/5 text-sm whitespace-pre-wrap leading-relaxed">
                                                        {inquiry.message}
                                                    </div>

                                                    <div className="mt-4 flex gap-2">
                                                        <a
                                                            href={`mailto:${inquiry.email}?subject=Re: ${encodeURIComponent(inquiry.subject)}`}
                                                            className="text-xs px-3 py-1.5 bg-accent-primary text-black font-bold rounded hover:opacity-90 transition-opacity"
                                                        >
                                                            답장하기
                                                        </a>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ========== 보안 로그 탭 (v2.5.0) ========== */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-2xl font-bold flex items-center gap-2">
                                            🛡️ 실시간 보안 모니터링
                                            {isLoadingLogs && <span className="animate-spin text-sm">⏳</span>}
                                        </h1>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={fetchSecurityLogs}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-all"
                                            >
                                                새로고침
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-text-secondary text-xs mb-1">총 로그 (최근 100건)</p>
                                            <p className="text-2xl font-bold">{securityLogs.length}</p>
                                        </div>
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-red-400 text-xs mb-1">공격 의심 (ATTACK)</p>
                                            <p className="text-2xl font-bold text-red-500">
                                                {securityLogs.filter(l => l.type === 'ATTACK').length}
                                            </p>
                                        </div>
                                        <div className="bg-bg-primary p-5 rounded-2xl border border-white/10">
                                            <p className="text-amber-400 text-xs mb-1">차단 건수 (BLOCK)</p>
                                            <p className="text-2xl font-bold text-amber-500">
                                                {securityLogs.filter(l => l.type === 'BLOCK').length}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Logs Table */}
                                    <div className="bg-bg-primary rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 text-text-secondary text-xs uppercase tracking-wider">
                                                        <th className="px-6 py-4 font-semibold">시간</th>
                                                        <th className="px-6 py-4 font-semibold">유형</th>
                                                        <th className="px-6 py-4 font-semibold">IP 주소</th>
                                                        <th className="px-6 py-4 font-semibold">사유 / 경로</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {securityLogs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-text-tertiary">
                                                                기록된 보안 로그가 없습니다.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        securityLogs.map((log) => (
                                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                                                <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                                                                    {new Date(log.timestamp).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'ATTACK' ? 'bg-red-500/20 text-red-400' :
                                                                        log.type === 'BLOCK' ? 'bg-amber-500/20 text-amber-400' :
                                                                            'bg-blue-500/20 text-blue-400'
                                                                        }`}>
                                                                        {log.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-mono text-white">
                                                                    {log.ip}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm text-white mb-0.5">{log.reason}</div>
                                                                    <div className="text-[10px] text-text-tertiary font-mono">{log.path}</div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Info Box */}
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                        <p className="text-xs text-blue-400 leading-relaxed">
                                            💡 <strong>보안 수치 안내:</strong> 현재 API Rate Limit는 IP당 10초 내 20회 요청으로 설정되어 있습니다.
                                            초과 시 자동으로 <code>BLOCK</code> 상태로 로깅되며, 반복적인 위협은 <code>ATTACK</code>으로 분류됩니다.
                                            실제 방어 효율을 높이려면 Cloudflare WAF 설정을 권장합니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ========== 설정 탭 ========== */}
                            {activeTab === 'settings' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">⚙️ 사이트 설정</h1>
                                    <div className="bg-bg-primary rounded-xl p-6 border border-white/10 mb-6">
                                        <h3 className="font-semibold mb-4 text-accent-primary">📊 Google Analytics</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="ga-enabled"
                                                    checked={analyticsEdits.enabled}
                                                    onChange={e => setAnalyticsEdits({ ...analyticsEdits, enabled: e.target.checked })}
                                                    className="w-5 h-5 rounded border-white/20 bg-bg-secondary text-accent-primary focus:ring-accent-primary"
                                                />
                                                <label htmlFor="ga-enabled" className="text-sm cursor-pointer select-none">사용 설정</label>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-text-secondary mb-2">추적 ID (G-XXXXXXXXXX)</label>
                                                <input
                                                    type="text"
                                                    value={analyticsEdits.googleAnalyticsId}
                                                    onChange={e => setAnalyticsEdits({ ...analyticsEdits, googleAnalyticsId: e.target.value })}
                                                    placeholder="G-ABC1234567"
                                                    className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-primary font-mono"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    Google Analytics 대시보드에서 측정 ID를 확인하세요.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveAnalytics}
                                            className="px-6 py-3 bg-accent-primary text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
                                        >
                                            설정 저장하기
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ========== SEO 탭 ========== */}
                            {activeTab === 'seo' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">🔍 SEO & 마케팅 설정</h1>

                                    <div className="space-y-6">

                                        {/* ===== SEO 통계 대시보드 ===== */}
                                        <div className="bg-bg-primary rounded-xl p-6 border border-white/10">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                                                <h3 className="font-semibold text-accent-primary text-lg">📊 SEO 통계 대시보드</h3>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Range selector */}
                                                    {[7, 14, 30].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => {
                                                                setSeoAnalyticsRange(d)
                                                                setSeoAnalyticsLoading(true)
                                                                fetchWithAuth(`/api/admin/seo-analytics?range=${d}&view=${seoAnalyticsView}`)
                                                                    .then(res => res.json())
                                                                    .then(data => { if (!data.error) setSeoAnalytics(data) })
                                                                    .catch(() => { })
                                                                    .finally(() => setSeoAnalyticsLoading(false))
                                                            }}
                                                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${seoAnalyticsRange === d
                                                                ? 'bg-accent-primary text-black font-bold'
                                                                : 'bg-white/5 text-text-secondary hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {d}일
                                                        </button>
                                                    ))}
                                                    <span className="text-white/20">|</span>
                                                    {/* View type selector: daily / weekly / monthly */}
                                                    {(['daily', 'weekly', 'monthly'] as const).map(v => (
                                                        <button
                                                            key={v}
                                                            onClick={() => {
                                                                setSeoAnalyticsView(v)
                                                                // 자동 re-fetch
                                                                setSeoAnalyticsLoading(true)
                                                                fetchWithAuth(`/api/admin/seo-analytics?range=${seoAnalyticsRange}&view=${v}`)
                                                                    .then(res => res.json())
                                                                    .then(data => { if (!data.error) setSeoAnalytics(data) })
                                                                    .catch(() => { })
                                                                    .finally(() => setSeoAnalyticsLoading(false))
                                                            }}
                                                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${seoAnalyticsView === v
                                                                ? 'bg-purple-500 text-white font-bold'
                                                                : 'bg-white/5 text-text-secondary hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {v === 'daily' ? '📅 일별' : v === 'weekly' ? '📊 주별' : '📆 월별'}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            setSeoAnalyticsLoading(true)
                                                            fetchWithAuth(`/api/admin/seo-analytics?range=${seoAnalyticsRange}&view=${seoAnalyticsView}`)
                                                                .then(res => res.json())
                                                                .then(data => { if (!data.error) setSeoAnalytics(data) })
                                                                .catch(() => { })
                                                                .finally(() => setSeoAnalyticsLoading(false))
                                                        }}
                                                        disabled={seoAnalyticsLoading}
                                                        className="px-3 py-1 text-xs rounded-lg bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors disabled:opacity-50"
                                                    >
                                                        {seoAnalyticsLoading ? '로딩...' : '🔄 새로고침'}
                                                    </button>
                                                </div>
                                            </div>

                                            {!seoAnalytics ? (
                                                <div className="text-center py-12">
                                                    <p className="text-text-tertiary mb-4">통계 데이터를 불러오려면 새로고침 버튼을 클릭하세요</p>
                                                    <button
                                                        onClick={() => {
                                                            setSeoAnalyticsLoading(true)
                                                            fetchWithAuth(`/api/admin/seo-analytics?range=${seoAnalyticsRange}&view=${seoAnalyticsView}`)
                                                                .then(res => res.json())
                                                                .then(data => { if (!data.error) setSeoAnalytics(data) })
                                                                .catch(() => { })
                                                                .finally(() => setSeoAnalyticsLoading(false))
                                                        }}
                                                        disabled={seoAnalyticsLoading}
                                                        className="px-6 py-3 bg-accent-primary text-black font-bold rounded-xl hover:bg-accent-secondary transition-colors"
                                                    >
                                                        {seoAnalyticsLoading ? '불러오는 중...' : '📊 통계 불러오기'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Summary Cards */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                                                            <p className="text-xs text-blue-400 mb-1">오늘 방문자</p>
                                                            <p className="text-2xl font-bold text-white">{seoAnalytics.summary?.todayVisits?.toLocaleString() || 0}</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                                                            <p className="text-xs text-green-400 mb-1">주간 방문자</p>
                                                            <p className="text-2xl font-bold text-white">{seoAnalytics.summary?.weeklyVisits?.toLocaleString() || 0}</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                                                            <p className="text-xs text-purple-400 mb-1">월간 방문자</p>
                                                            <p className="text-2xl font-bold text-white">{seoAnalytics.summary?.monthlyVisits?.toLocaleString() || 0}</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/20">
                                                            <p className="text-xs text-amber-400 mb-1">일 평균</p>
                                                            <p className="text-2xl font-bold text-white">{seoAnalytics.summary?.avgDailyVisits?.toLocaleString() || 0}</p>
                                                        </div>
                                                    </div>

                                                    {/* Bot Stats */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                            <p className="text-xs text-text-tertiary mb-1">🤖 크롤러 방문 (오늘)</p>
                                                            <p className="text-xl font-bold text-cyan-400">{seoAnalytics.summary?.todayBots || 0}</p>
                                                        </div>
                                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                            <p className="text-xs text-text-tertiary mb-1">🤖 크롤러 방문 (기간 합계)</p>
                                                            <p className="text-xl font-bold text-cyan-400">{seoAnalytics.summary?.totalBotVisits?.toLocaleString() || 0}</p>
                                                        </div>
                                                    </div>

                                                    {/* Visitors Chart (adapts to view type) */}
                                                    {(() => {
                                                        const chartData = seoAnalytics.aggregatedVisitors || seoAnalytics.dailyVisitors || []
                                                        return chartData.length > 0 && (
                                                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                                <h4 className="text-sm font-semibold mb-3 text-text-secondary">
                                                                    📈 {seoAnalyticsView === 'daily' ? '일별' : seoAnalyticsView === 'weekly' ? '주별' : '월별'} 방문자 추이
                                                                </h4>
                                                                <div className="flex items-end gap-1 h-32">
                                                                    {(() => {
                                                                        const maxVisits = Math.max(...chartData.map((d: any) => d.visits), 1)
                                                                        return chartData.map((d: any, i: number) => (
                                                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                                                                    {d.label || d.date}: {d.visits}명
                                                                                </div>
                                                                                <div
                                                                                    className="w-full bg-accent-primary/70 rounded-t-sm hover:bg-accent-primary transition-colors cursor-pointer"
                                                                                    style={{ height: `${Math.max((d.visits / maxVisits) * 100, 2)}%` }}
                                                                                />
                                                                                {chartData.length <= 14 && (
                                                                                    <span className="text-[9px] text-text-tertiary">{(d.label || d.date || '').slice(-5)}</span>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Two column: Referrers + Countries */}
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {/* Top Referrers */}
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="text-sm font-semibold text-text-secondary">🔗 유입 경로 TOP 10</h4>
                                                                <div className="flex gap-1">
                                                                    {(['all', 'period'] as const).map(tab => (
                                                                        <button
                                                                            key={tab}
                                                                            onClick={() => setSeoPeriodTab(tab)}
                                                                            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${seoPeriodTab === tab
                                                                                ? 'bg-blue-500/30 text-blue-400 font-bold'
                                                                                : 'bg-white/5 text-text-tertiary hover:bg-white/10'
                                                                                }`}
                                                                        >
                                                                            {tab === 'all' ? '전체' : seoAnalyticsView === 'daily' ? '일별' : seoAnalyticsView === 'weekly' ? '주별' : '월별'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {seoPeriodTab === 'all' ? (
                                                                /* 전체 합산 (기존) */
                                                                seoAnalytics.topReferrers?.length > 0 ? (
                                                                    <div className="space-y-1">
                                                                        {seoAnalytics.topReferrers.slice(0, 10).map((ref: any, i: number) => {
                                                                            const maxRef = seoAnalytics.topReferrers[0]?.count || 1
                                                                            const isExpanded = expandedReferrer === ref.domain
                                                                            return (
                                                                                <div key={i}>
                                                                                    <button
                                                                                        onClick={() => setExpandedReferrer(isExpanded ? null : ref.domain)}
                                                                                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                                                                    >
                                                                                        <span className="text-xs text-text-tertiary w-5">{i + 1}</span>
                                                                                        <span className="text-sm">{ref.icon || '🔗'}</span>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="flex justify-between mb-0.5">
                                                                                                <span className="text-xs text-text-primary truncate">
                                                                                                    {ref.label || ref.domain}
                                                                                                    {ref.domain === 'direct' && (
                                                                                                        <span className="ml-1 text-[10px] text-text-tertiary" title="주소 직접 입력, 북마크, 앱 내 브라우저 등">ⓘ</span>
                                                                                                    )}
                                                                                                </span>
                                                                                                <span className="text-xs font-mono text-blue-400 ml-2">{ref.count}</span>
                                                                                            </div>
                                                                                            <div className="w-full bg-white/5 rounded-full h-1.5">
                                                                                                <div className="bg-blue-500 rounded-full h-1.5 transition-all" style={{ width: `${(ref.count / maxRef) * 100}%` }} />
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className={`text-[10px] text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="ml-8 mr-2 mt-1 mb-2 p-3 bg-black/30 rounded-lg border border-white/5 space-y-3">
                                                                                            {ref.topCountries && ref.topCountries.length > 0 && (
                                                                                                <div>
                                                                                                    <p className="text-[10px] text-text-tertiary mb-1.5 uppercase tracking-wider">🌍 국가별 분포</p>
                                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                                        {ref.topCountries.map((c: any, ci: number) => (
                                                                                                            <span key={ci} className="text-[11px] bg-white/5 px-2 py-0.5 rounded-md text-text-secondary">
                                                                                                                {c.name} <span className="text-blue-400 font-mono">{c.count}</span>
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                            {ref.topLandingPages && ref.topLandingPages.length > 0 && (
                                                                                                <div>
                                                                                                    <p className="text-[10px] text-text-tertiary mb-1.5 uppercase tracking-wider">📄 방문 페이지</p>
                                                                                                    <div className="space-y-1">
                                                                                                        {ref.topLandingPages.map((pg: any, pi: number) => (
                                                                                                            <div key={pi} className="flex justify-between text-[11px]">
                                                                                                                <span className="text-text-secondary truncate max-w-[180px]">{pg.path}</span>
                                                                                                                <span className="text-amber-400 font-mono ml-2">{pg.count}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-text-tertiary">아직 데이터가 없습니다</p>
                                                                )
                                                            ) : (
                                                                /* 기간별 (일/주/월) */
                                                                seoAnalytics.referrersByPeriod?.length > 0 ? (
                                                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                                                        {seoAnalytics.referrersByPeriod.map((p: any, pi: number) => (
                                                                            <div key={pi} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                                                                <p className="text-[11px] font-semibold text-purple-400 mb-2">📅 {p.period}</p>
                                                                                <div className="space-y-1">
                                                                                    {p.referrers.map((ref: any, ri: number) => {
                                                                                        const maxR = p.referrers[0]?.count || 1
                                                                                        return (
                                                                                            <div key={ri} className="flex items-center gap-2">
                                                                                                <span className="text-[10px] text-text-tertiary w-4">{ri + 1}</span>
                                                                                                <span className="text-xs">{ref.icon}</span>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="flex justify-between mb-0.5">
                                                                                                        <span className="text-[11px] text-text-primary truncate">{ref.label || ref.domain}</span>
                                                                                                        <span className="text-[11px] font-mono text-blue-400 ml-1">{ref.count}</span>
                                                                                                    </div>
                                                                                                    <div className="w-full bg-white/5 rounded-full h-1">
                                                                                                        <div className="bg-blue-500/70 rounded-full h-1" style={{ width: `${(ref.count / maxR) * 100}%` }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-text-tertiary">기간별 데이터가 없습니다</p>
                                                                )
                                                            )}
                                                        </div>

                                                        {/* Country Distribution */}
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="text-sm font-semibold text-text-secondary">🌍 국가별 방문자</h4>
                                                                <div className="flex gap-1">
                                                                    {(['all', 'period'] as const).map(tab => (
                                                                        <button
                                                                            key={tab}
                                                                            onClick={() => setSeoPeriodTab(tab)}
                                                                            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${seoPeriodTab === tab
                                                                                ? 'bg-green-500/30 text-green-400 font-bold'
                                                                                : 'bg-white/5 text-text-tertiary hover:bg-white/10'
                                                                                }`}
                                                                        >
                                                                            {tab === 'all' ? '전체' : seoAnalyticsView === 'daily' ? '일별' : seoAnalyticsView === 'weekly' ? '주별' : '월별'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {seoPeriodTab === 'all' ? (
                                                                /* 전체 합산 (기존) */
                                                                seoAnalytics.countryDistribution?.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {seoAnalytics.countryDistribution.slice(0, 10).map((c: any, i: number) => {
                                                                            const maxC = seoAnalytics.countryDistribution[0]?.count || 1
                                                                            return (
                                                                                <div key={i} className="flex items-center gap-2">
                                                                                    <span className="text-xs text-text-tertiary w-5">{i + 1}</span>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex justify-between mb-0.5">
                                                                                            <span className="text-xs text-text-primary">{c.name} ({c.code})</span>
                                                                                            <span className="text-xs text-text-tertiary">{c.count}</span>
                                                                                        </div>
                                                                                        <div className="w-full bg-white/5 rounded-full h-1.5">
                                                                                            <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${(c.count / maxC) * 100}%` }} />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-text-tertiary">아직 데이터가 없습니다</p>
                                                                )
                                                            ) : (
                                                                /* 기간별 (일/주/월) */
                                                                seoAnalytics.countriesByPeriod?.length > 0 ? (
                                                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                                                        {seoAnalytics.countriesByPeriod.map((p: any, pi: number) => (
                                                                            <div key={pi} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                                                                <p className="text-[11px] font-semibold text-purple-400 mb-2">📅 {p.period}</p>
                                                                                <div className="space-y-1">
                                                                                    {p.countries.map((c: any, ci: number) => {
                                                                                        const maxC = p.countries[0]?.count || 1
                                                                                        return (
                                                                                            <div key={ci} className="flex items-center gap-2">
                                                                                                <span className="text-[10px] text-text-tertiary w-4">{ci + 1}</span>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="flex justify-between mb-0.5">
                                                                                                        <span className="text-[11px] text-text-primary">{c.name} ({c.code})</span>
                                                                                                        <span className="text-[11px] font-mono text-green-400 ml-1">{c.count}</span>
                                                                                                    </div>
                                                                                                    <div className="w-full bg-white/5 rounded-full h-1">
                                                                                                        <div className="bg-green-500/70 rounded-full h-1" style={{ width: `${(c.count / maxC) * 100}%` }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-text-tertiary">기간별 데이터가 없습니다</p>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Country Trend Chart */}
                                                    {seoAnalytics.countryTrend && seoAnalytics.countryTrend.length > 0 && seoAnalytics.top5CountryCodes && (
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <h4 className="text-sm font-semibold mb-3 text-text-secondary">🌍 국가별 방문 추이 (TOP 5)</h4>
                                                            {/* Legend */}
                                                            <div className="flex flex-wrap gap-3 mb-3">
                                                                {seoAnalytics.top5CountryCodes.map((c: any, i: number) => {
                                                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-1.5">
                                                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} />
                                                                            <span className="text-[11px] text-text-secondary">{c.name} ({c.code})</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            {/* Chart area */}
                                                            <div className="flex items-end gap-1 h-36 overflow-x-auto">
                                                                {(() => {
                                                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                                                                    const allValues = seoAnalytics.countryTrend.flatMap((d: any) =>
                                                                        Object.values(d.countries) as number[]
                                                                    )
                                                                    const maxVal = Math.max(...allValues, 1)
                                                                    const showLabels = seoAnalytics.countryTrend.length <= 14
                                                                    return seoAnalytics.countryTrend.map((d: any, di: number) => (
                                                                        <div key={di} className="flex-1 min-w-[20px] flex flex-col items-center gap-0.5 group relative">
                                                                            {/* Tooltip */}
                                                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-black/95 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 border border-white/10 shadow-lg">
                                                                                <div className="font-semibold mb-1">{d.date}</div>
                                                                                {seoAnalytics.top5CountryCodes.map((c: any, ci: number) => (
                                                                                    <div key={ci} className="flex items-center gap-1.5">
                                                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[ci] }} />
                                                                                        <span>{c.name}: </span>
                                                                                        <span className="font-mono" style={{ color: colors[ci] }}>{d.countries[c.code] || 0}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            {/* Grouped bars */}
                                                                            <div className="w-full flex gap-px items-end h-full">
                                                                                {seoAnalytics.top5CountryCodes.map((c: any, ci: number) => {
                                                                                    const val = d.countries[c.code] || 0
                                                                                    return (
                                                                                        <div
                                                                                            key={ci}
                                                                                            className="flex-1 rounded-t-sm transition-all hover:brightness-125"
                                                                                            style={{
                                                                                                backgroundColor: colors[ci],
                                                                                                height: `${Math.max((val / maxVal) * 100, val > 0 ? 3 : 0)}%`,
                                                                                                opacity: 0.85,
                                                                                            }}
                                                                                        />
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                            {showLabels && (
                                                                                <span className="text-[8px] text-text-tertiary">{d.date.slice(5)}</span>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Two column: Bot Activity + Popular Pages */}
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {/* Bot Activity */}
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <h4 className="text-sm font-semibold mb-3 text-text-secondary">🤖 크롤러 활동</h4>
                                                            {seoAnalytics.botDistribution?.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {seoAnalytics.botDistribution.slice(0, 10).map((bot: any, i: number) => (
                                                                        <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                                                                            <span className="text-xs text-text-primary">
                                                                                {bot.name === 'googlebot' ? '🔍 Googlebot' :
                                                                                    bot.name === 'bingbot' ? '🔎 Bingbot' :
                                                                                        bot.name === 'yandexbot' ? '🇷🇺 Yandex' :
                                                                                            bot.name === 'applebot' ? '🍎 Applebot' :
                                                                                                bot.name === 'twitterbot' ? '🐦 Twitterbot' :
                                                                                                    bot.name === 'facebot' ? '📘 Facebook' :
                                                                                                        bot.name === 'naverbot' || bot.name === 'yeti' ? '🇰🇷 Naver' :
                                                                                                            bot.name === 'semrushbot' ? '📊 Semrush' :
                                                                                                                bot.name === 'ahrefsbot' ? '📊 Ahrefs' :
                                                                                                                    bot.name}
                                                                            </span>
                                                                            <span className="text-xs font-mono text-cyan-400">{bot.count}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-text-tertiary">아직 크롤러 활동이 없습니다</p>
                                                            )}
                                                        </div>

                                                        {/* Popular Pages */}
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <h4 className="text-sm font-semibold mb-3 text-text-secondary">📄 인기 페이지 TOP 10</h4>
                                                            {seoAnalytics.topPages?.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {seoAnalytics.topPages.slice(0, 10).map((pg: any, i: number) => (
                                                                        <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                                                                            <span className="text-xs text-text-primary truncate max-w-[200px]">{pg.path}</span>
                                                                            <span className="text-xs font-mono text-amber-400">{pg.count}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-text-tertiary">아직 데이터가 없습니다</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Hourly Distribution */}
                                                    {seoAnalytics.hourlyDistribution && (
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <h4 className="text-sm font-semibold mb-3 text-text-secondary">⏰ 시간대별 방문 (UTC)</h4>
                                                            <div className="flex items-end gap-0.5 h-20">
                                                                {(() => {
                                                                    const maxH = Math.max(...seoAnalytics.hourlyDistribution, 1)
                                                                    return seoAnalytics.hourlyDistribution.map((count: number, hr: number) => (
                                                                        <div key={hr} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                                                                {hr}시: {count}
                                                                            </div>
                                                                            <div
                                                                                className="w-full bg-purple-500/60 rounded-t-sm hover:bg-purple-500 transition-colors cursor-pointer"
                                                                                style={{ height: `${Math.max((count / maxH) * 100, 2)}%` }}
                                                                            />
                                                                        </div>
                                                                    ))
                                                                })()}
                                                            </div>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-[9px] text-text-tertiary">0시</span>
                                                                <span className="text-[9px] text-text-tertiary">6시</span>
                                                                <span className="text-[9px] text-text-tertiary">12시</span>
                                                                <span className="text-[9px] text-text-tertiary">18시</span>
                                                                <span className="text-[9px] text-text-tertiary">23시</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* SEO Health Score */}
                                                    {seoAnalytics.seoHealth && (
                                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                                            <h4 className="text-sm font-semibold mb-3 text-text-secondary">✅ SEO 건강도</h4>
                                                            <div className="flex items-center gap-4 mb-3">
                                                                <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                                                                    <span className="text-xl font-bold text-green-400">{seoAnalytics.seoHealth.score}</span>
                                                                </div>
                                                                <div className="text-sm text-text-secondary">
                                                                    <p>SEO 최적화 상태가 양호합니다</p>
                                                                    <p className="text-xs text-text-tertiary mt-1">모든 SEO 요소가 정상 적용됨</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {[
                                                                    { label: 'Sitemap', ok: seoAnalytics.seoHealth.hasSitemap },
                                                                    { label: 'Robots.txt', ok: seoAnalytics.seoHealth.hasRobotsTxt },
                                                                    { label: 'Google 인증', ok: seoAnalytics.seoHealth.hasGoogleVerification },
                                                                    { label: 'Analytics', ok: seoAnalytics.seoHealth.hasAnalytics },
                                                                    { label: 'OG Tags', ok: seoAnalytics.seoHealth.hasOgTags },
                                                                    { label: 'JSON-LD', ok: seoAnalytics.seoHealth.hasJsonLd },
                                                                ].map((item, i) => (
                                                                    <div key={i} className={`text-xs px-2 py-1.5 rounded-lg text-center ${item.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                        {item.ok ? '✅' : '❌'} {item.label}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-6 border border-white/10">
                                            <h3 className="font-semibold mb-4 text-accent-primary">📄 검색 엔진 파일</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Sitemap URL</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value="https://kdance.xyz/sitemap.xml"
                                                            className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('https://kdance.xyz/sitemap.xml')
                                                                alert('복사되었습니다!')
                                                            }}
                                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                                        >
                                                            복사
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Robots.txt URL</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value="https://kdance.xyz/robots.txt"
                                                            className="flex-1 px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('https://kdance.xyz/robots.txt')
                                                                alert('복사되었습니다!')
                                                            }}
                                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                                        >
                                                            복사
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Server Migration Section */}
                                                <div className="pt-6 border-t border-white/10 mt-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white mb-1">
                                                                Server Data Migration
                                                                {isServerSynced && <span className="ml-2 text-xs bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">SYNCED</span>}
                                                            </h3>
                                                            <p className="text-xs text-text-tertiary">
                                                                Move your local data to B2 Cloud Storage for SEO and Multi-device access.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('Upload all local data to B2 Server? This will overwrite existing server data.')) return
                                                                const success = await migrateToB2()
                                                                if (success) alert('✅ Migration Successful! Data is now on server.')
                                                                else alert('❌ Migration Failed. Check console.')
                                                            }}
                                                            disabled={isServerSynced}
                                                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isServerSynced
                                                                ? 'bg-green-500/20 text-green-500 cursor-default'
                                                                : 'bg-accent-primary hover:bg-accent-secondary text-black shadow-lg hover:scale-105'
                                                                }`}
                                                        >
                                                            {isServerSynced ? 'Running on Server' : 'Migrate to Server'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-bg-primary rounded-xl p-6 border border-white/10">
                                            <h3 className="font-semibold mb-4 text-accent-primary">✅ 소유권 확인</h3>
                                            <p className="text-sm text-text-secondary mb-4">
                                                Google/Naver에서 발급받은 확인 코드를 알려주시면 제가 즉시 반영해 드립니다.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Google Verification ID</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value="OoRNUH40e5AbJhU5TXIq1_LtDkDwIL4jhST76dBAoq8"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-text-secondary mb-2">Naver Verification ID</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value="naver_verification_code_placeholder"
                                                        className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-secondary font-mono text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ===== 벤치마크 대시보드 ===== */}
                                    {seoAnalytics && (
                                        <SeoBenchmarkDashboard
                                            seoAnalytics={seoAnalytics}
                                            totalVideos={videos.length}
                                            totalStreamers={streamers.length}
                                        />
                                    )}
                                </div>
                            )}

                            {/* ========== 데이터 백업 탭 ========== */}
                            {activeTab === 'data' && (
                                <div>
                                    <h1 className="text-2xl font-bold mb-6">💾 데이터 백업 및 마이그레이션</h1>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Export Section */}
                                        <div className="bg-bg-primary rounded-2xl p-6 border border-white/10">
                                            <div className="text-3xl mb-4">📤</div>
                                            <h3 className="text-xl font-bold mb-2">백업 데이터 내보내기</h3>
                                            <p className="text-text-secondary text-sm mb-6">
                                                현재 브라우저에 저장된 모든 스트리머와 비디오 데이터를 JSON 파일로 다운로드합니다.
                                                다른 PC나 브라우저에서 작업할 때 유용합니다.
                                            </p>
                                            <div className="space-y-4">
                                                <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs">
                                                    <div className="flex justify-between mb-2 pb-1 border-b border-white/10">
                                                        <span className="text-text-secondary">B2 Download Token:</span>
                                                        <span className={downloadToken ? 'text-green-400' : 'text-red-400'}>
                                                            {downloadToken ? 'SYNCED' : 'MISSING'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between mb-2 pb-1 border-b border-white/10">
                                                        <span className="text-text-secondary">Token Length:</span>
                                                        <span>{downloadToken ? downloadToken.length : 0} chars</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-text-secondary">Next.js Environment:</span>
                                                        <span className="text-blue-400">{process.env.NODE_ENV}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const diagnostic = {
                                                                tokenPresent: !!downloadToken,
                                                                tokenPrefix: downloadToken?.substring(0, 10),
                                                                videosCount: videos.length,
                                                                streamersCount: streamers.length,
                                                                userAgent: navigator.userAgent
                                                            }
                                                            console.log('DIAGNOSTIC DATA:', diagnostic)
                                                            alert('Diagnostic data logged to console. Please check F12.')
                                                        }}
                                                        className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-semibold"
                                                    >
                                                        🔍 Run Detailed Sync Check
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleExportData}
                                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-semibold flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span> JSON 백업 파일 다운로드
                                            </button>
                                        </div>

                                        {/* Import Section */}
                                        <div className="bg-bg-primary rounded-2xl p-6 border border-white/10">
                                            <div className="text-3xl mb-4">📥</div>
                                            <h3 className="text-xl font-bold mb-2">데이터 가져오기</h3>
                                            <p className="text-text-secondary text-sm mb-6">
                                                이전에 백업한 JSON 파일을 업로드하여 데이터를 복원하거나 통합합니다.
                                                기존 데이터와 ID가 겹칠 경우 백업 파일의 데이터로 덮어씌워집니다.
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImportData}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full py-3 bg-accent-primary/20 border border-accent-primary/30 text-accent-primary rounded-xl font-semibold flex items-center justify-center gap-2">
                                                    <span>📂</span> 백업 파일 선택하기
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ========== 시스템 복구 센터 (B2 자동 백업) ========== */}
                                    <div className="mt-8 bg-bg-primary rounded-2xl border border-white/10 overflow-hidden">
                                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <span className="text-blue-400">🛡️</span> B2 시스템 복구 센터
                                                </h3>
                                                <p className="text-text-secondary text-sm mt-1">
                                                    저장 시마다 자동으로 생성된 최근 50개의 스냅샷 목록입니다.
                                                </p>
                                            </div>
                                            <button
                                                onClick={fetchBackups}
                                                disabled={isLoadingBackups}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                            >
                                                {isLoadingBackups ? '🔄' : '🔃 Refresh'}
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 text-text-secondary text-xs uppercase">
                                                    <tr>
                                                        <th className="px-6 py-3">파일 이름</th>
                                                        <th className="px-6 py-3">생성 일시</th>
                                                        <th className="px-6 py-3">크기 (KB)</th>
                                                        <th className="px-6 py-3 text-right">작업</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {backups.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                                                                {isLoadingBackups ? '백업 목록을 불러오는 중...' : '생성된 백업이 없습니다.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        backups.map((b) => (
                                                            <tr key={b.fileId} className="hover:bg-white/[0.02] transition-colors">
                                                                <td className="px-6 py-4 font-mono text-xs">{b.fileName}</td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    {new Date(b.uploadTimestamp).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    {(b.contentLength / 1024).toFixed(1)} KB
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button
                                                                        onClick={() => handleRestore(b.fileName)}
                                                                        disabled={isRestoring}
                                                                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                                    >
                                                                        복구하기
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-2xl">
                                        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                            💡 마이그레이션 팁
                                        </h4>
                                        <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
                                            <li>로컬 기기에서 영상 업로드 후, 이 백업 파일을 사용하여 실제 서버(Production)에 동일한 데이터를 옮길 수 있습니다.</li>
                                            <li>백업 파일에는 영상 파일 자체가 포함되지 않으며, Backblaze B2에 업로드된 URL 정보가 포함됩니다.</li>
                                            <li>정기적으로 백업을 수행하여 데이터 손실을 방지하세요.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <SecurityMonitorPanel />
                            )}

                            {activeTab === 'upload-queue' && (
                                <VideoQueuePanel />
                            )}
                        </div >
                    </div >
                </div >
            </div >
        </div >
    )
}

// ═══════════════════════════════════════════════════════════════════════
// Security Monitor Panel Component
// ═══════════════════════════════════════════════════════════════════════
function SecurityMonitorPanel() {
    const { getAdminHeaders } = useAuth()
    const [logs, setLogs] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterSeverity, setFilterSeverity] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')

    const fetchLogs = async () => {
        setLoading(true)
        setError(null)
        try {
            const headers = getAdminHeaders()
            const res = await fetch('/api/security-logs', { headers })
            if (!res.ok) {
                if (res.status === 401) {
                    setError('인증이 필요합니다. 재로그인 해주세요.')
                } else {
                    setError('보안 로그를 불러오지 못했습니다.')
                }
                return
            }
            const data = await res.json()
            setLogs(data.logs || [])
            setStats(data.stats || null)
        } catch {
            setError('서버 연결에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 30000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const severityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
            case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
        }
    }

    const typeLabel = (t: string) => {
        const map: Record<string, string> = {
            'AUTH_SUCCESS': '✅ 인증 성공',
            'AUTH_FAILURE': '❌ 인증 실패',
            'UNAUTHORIZED_ACCESS': '🚫 미인증 접근',
            'FILE_UPLOAD': '📤 파일 업로드',
            'FILE_DELETE': '🗑️ 파일 삭제',
            'DB_MODIFY': '💾 DB 수정',
            'SETTINGS_MODIFY': '⚙️ 설정 변경',
            'RATE_LIMIT_HIT': '⚡ 속도 제한',
            'SUSPICIOUS_REQUEST': '🔍 의심 요청',
            'ADMIN_LOGIN': '🔐 관리자 로그인',
            'ADMIN_LOGIN_FAILED': '🔴 로그인 실패',
            'API_ERROR': '⚠️ API 오류',
        }
        return map[t] || t
    }

    const getThreatLevel = () => {
        if (!stats) return { level: '안전', color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢' }
        if (stats.criticalEvents > 5) return { level: '위험', color: 'text-red-400', bg: 'bg-red-500/20', icon: '🔴' }
        if (stats.criticalEvents > 0 || stats.blockedLast24h > 10) return { level: '주의', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🟠' }
        if (stats.blockedLast24h > 0) return { level: '경고', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '🟡' }
        return { level: '안전', color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢' }
    }

    const filteredLogs = logs.filter(log => {
        if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false
        if (filterType !== 'all' && log.type !== filterType) return false
        return true
    })

    const threat = getThreatLevel()

    if (loading && !stats) {
        return (
            <div className="text-center py-20">
                <div className="inline-block w-10 h-10 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">보안 로그 로딩 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🛡️ 보안 모니터링</h2>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition text-sm"
                >
                    🔄 새로고침
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {/* Threat Level Banner */}
            <div className={`p-6 rounded-2xl border ${threat.bg} border-white/10`}>
                <div className="flex items-center gap-4">
                    <span className="text-4xl">{threat.icon}</span>
                    <div>
                        <h3 className={`text-xl font-bold ${threat.color}`}>현재 위협 수준: {threat.level}</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            지난 24시간: 총 {stats?.last24h || 0}건의 이벤트, {stats?.blockedLast24h || 0}건 차단, {stats?.uniqueIPs || 0}개 고유 IP
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-white">{stats.last24h}</div>
                        <div className="text-sm text-text-secondary mt-1">24시간 이벤트</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-red-400">{stats.blockedLast24h}</div>
                        <div className="text-sm text-text-secondary mt-1">차단된 요청</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-orange-400">{stats.criticalEvents}</div>
                        <div className="text-sm text-text-secondary mt-1">위험 이벤트</div>
                    </div>
                    <div className="bg-bg-secondary rounded-xl p-4 border border-white/10">
                        <div className="text-3xl font-bold text-blue-400">{stats.uniqueIPs}</div>
                        <div className="text-sm text-text-secondary mt-1">고유 IP</div>
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {stats?.byType && (
                <div className="bg-bg-secondary rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold mb-4">📊 이벤트 유형별 통계 (24시간)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                            <span>🚫</span>
                            <div>
                                <div className="text-sm text-red-400 font-bold">{stats.byType.unauthorized}</div>
                                <div className="text-xs text-text-secondary">미인증 접근</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
                            <span>⚡</span>
                            <div>
                                <div className="text-sm text-orange-400 font-bold">{stats.byType.rateLimited}</div>
                                <div className="text-xs text-text-secondary">속도 제한</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                            <span>🔴</span>
                            <div>
                                <div className="text-sm text-yellow-400 font-bold">{stats.byType.loginFailed}</div>
                                <div className="text-xs text-text-secondary">로그인 실패</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                            <span>🗑️</span>
                            <div>
                                <div className="text-sm text-purple-400 font-bold">{stats.byType.fileDeleted}</div>
                                <div className="text-xs text-text-secondary">파일 삭제</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Blocked IPs */}
            {stats?.topBlockedIPs?.length > 0 && (
                <div className="bg-bg-secondary rounded-2xl p-6 border border-red-500/20">
                    <h3 className="text-lg font-bold mb-4 text-red-400">🚨 차단된 IP 목록 (Top 10)</h3>
                    <div className="space-y-2">
                        {stats.topBlockedIPs.map((ip: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-red-400 font-mono text-sm">{ip.ip}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-red-400 font-bold">{ip.count}회 차단</span>
                                    <span className="text-xs text-text-secondary">
                                        마지막: {new Date(ip.lastSeen).toLocaleString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <select
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                    className="bg-bg-secondary border border-white/10 rounded-lg px-4 py-2 text-sm"
                >
                    <option value="all">모든 심각도</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                </select>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-bg-secondary border border-white/10 rounded-lg px-4 py-2 text-sm"
                >
                    <option value="all">모든 유형</option>
                    <option value="UNAUTHORIZED_ACCESS">미인증 접근</option>
                    <option value="RATE_LIMIT_HIT">속도 제한</option>
                    <option value="ADMIN_LOGIN_FAILED">로그인 실패</option>
                    <option value="FILE_DELETE">파일 삭제</option>
                    <option value="FILE_UPLOAD">파일 업로드</option>
                    <option value="DB_MODIFY">DB 수정</option>
                    <option value="ADMIN_LOGIN">관리자 로그인</option>
                </select>
                <span className="text-sm text-text-secondary">
                    {filteredLogs.length}건 표시
                </span>
            </div>

            {/* Event Log Table */}
            <div className="bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold">📋 보안 이벤트 로그</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <span className="text-4xl block mb-3">🛡️</span>
                            <p>아직 기록된 보안 이벤트가 없습니다.</p>
                            <p className="text-xs mt-2">ADMIN_API_SECRET 환경 변수를 설정하면 보안 로깅이 활성화됩니다.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">시간</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">유형</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">심각도</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">IP</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">내용</th>
                                    <th className="text-left px-4 py-3 text-text-secondary font-medium">차단</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.slice(0, 100).map((log: any) => (
                                    <tr key={log.id} className={`hover:bg-white/5 ${log.blocked ? 'bg-red-500/5' : ''}`}>
                                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{typeLabel(log.type)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${severityColor(log.severity)}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.ip}</td>
                                        <td className="px-4 py-3 text-text-secondary max-w-xs truncate" title={log.details}>{log.details}</td>
                                        <td className="px-4 py-3">
                                            {log.blocked ? <span className="text-red-400 font-bold">차단</span> : <span className="text-green-400">허용</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Setup Guide */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">🔑 보안 설정 가이드</h3>
                <div className="text-sm text-text-secondary space-y-3">
                    <p>다음 환경 변수를 Vercel 프로젝트 설정에 추가해주세요:</p>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-xs space-y-1">
                        <p><span className="text-green-400">ADMIN_API_SECRET</span>=&lt;임의의 긴 문자열&gt;</p>
                        <p><span className="text-green-400">ADMIN_EMAIL</span>=ynast21@gmail.com</p>
                        <p><span className="text-green-400">ADMIN_PASSWORD_HASH</span>=&lt;SHA-256 해시값&gt;</p>
                    </div>
                    <p className="text-yellow-400">⚠️ ADMIN_API_SECRET을 설정하지 않으면 모든 보호 API가 인증 없이 요청을 거부합니다.</p>
                    <p>설정 후 재배포하면 모든 관리자 API에 자동으로 보안이 적용됩니다.</p>
                </div>
            </div>
        </div>
    )
}

// gif.js Script is loaded in the admin page layout
