'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

import { Streamer, Video } from '@/data/initialData'
import { getAuthToken } from './AuthContext'

interface StreamerContextType {
    streamers: Streamer[]
    videos: Video[]
    addStreamer: (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt' | 'followers'>) => Promise<boolean>
    removeStreamer: (id: string) => Promise<boolean>
    addVideo: (video: Omit<Video, 'id' | 'createdAt'>) => Promise<boolean>
    addVideoAtomic: (video: Omit<Video, 'id' | 'createdAt'>) => Promise<{ success: boolean; video?: Video }>
    removeVideo: (id: string) => Promise<boolean>
    incrementVideoView: (videoId: string) => void
    toggleVideoLike: (videoId: string, isLiked: boolean) => void
    toggleStreamerFollow: (streamerId: string, isFollowed: boolean) => void
    getStreamerVideos: (streamerId: string) => Video[]
    getStreamerById: (id: string) => Streamer | undefined
    importData: (data: { streamers: Streamer[], videos: Video[] }) => Promise<boolean>
    downloadToken: string | null
    downloadUrl: string | null
    activeBucketName: string | null
    migrateToB2: () => Promise<boolean>
    isServerSynced: boolean
    updateStreamer: (id: string, data: Partial<Streamer>) => Promise<boolean>
    updateVideo: (id: string, data: Partial<Video>) => Promise<boolean>
    isLoading: boolean
    lastError: string | null
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined)


export function StreamerProvider({ children }: { children: ReactNode }) {
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [videos, setVideos] = useState<Video[]>([])
    const [downloadToken, setDownloadToken] = useState<string | null>(null)
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [activeBucketName, setActiveBucketName] = useState<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [lastError, setLastError] = useState<string | null>(null)

    // ============================================================
    // B2-ONLY: Load data exclusively from server
    // No localStorage fallback, no initialData seeding
    // ============================================================
    useEffect(() => {
        const loadFromServer = async () => {
            console.log('--- StreamerProvider Init (B2-Only) ---')
            setIsLoading(true)

            try {
                const token = getAuthToken()
                const headers: Record<string, string> = {}
                if (token) headers['Authorization'] = `Bearer ${token}`

                const res = await fetch('/api/db', {
                    cache: 'no-store',
                    headers: headers as HeadersInit
                })

                if (res.ok) {
                    const dbData = await res.json()
                    if (dbData && dbData.streamers && dbData.videos) {
                        console.log(`✅ Loaded from B2: ${dbData.streamers.length} streamers, ${dbData.videos.length} videos`)

                        // 미분류 스트리머 자동 생성 (없으면)
                        let loadedStreamers = dbData.streamers
                        let needsSave = false
                        if (!loadedStreamers.find((s: any) => s.id === 'uncategorized')) {
                            loadedStreamers = [...loadedStreamers, {
                                id: 'uncategorized',
                                name: 'uncategorized',
                                koreanName: '미분류',
                                gradient: 'from-gray-800 to-gray-900',
                                videoCount: 0,
                                followers: 0,
                                createdAt: new Date().toISOString().split('T')[0],
                            }]
                            needsSave = true
                            console.log('📂 미분류 스트리머 자동 생성됨')
                        }

                        setStreamers(loadedStreamers)
                        setVideos(dbData.videos)
                        setLastError(null)

                        // 미분류 스트리머 B2에 저장 (fire-and-forget)
                        if (needsSave) {
                            fetch('/api/db', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
                                body: JSON.stringify({ streamers: loadedStreamers, videos: dbData.videos })
                            }).then(r => {
                                if (r.ok) console.log('✅ 미분류 스트리머 B2에 저장 완료')
                                else console.warn('⚠️ 미분류 스트리머 B2 저장 실패')
                            }).catch(() => console.warn('⚠️ 미분류 스트리머 B2 저장 실패'))
                        }
                    } else {
                        console.log('⚠️ B2 returned empty/null data (fresh setup)')
                        setStreamers([])
                        setVideos([])
                    }
                } else {
                    console.error(`❌ Server responded with ${res.status}`)
                    setLastError(`서버 응답 오류: ${res.status}`)
                }
            } catch (e) {
                console.error('❌ Failed to load from server:', e)
                setLastError('서버 연결 실패')
            }

            setIsLoaded(true)
            setIsLoading(false)
        }

        loadFromServer()
    }, [])

    // Fetch session-wide B2 Download Authorization
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const token = getAuthToken()
                const headers: HeadersInit = {}
                if (token) headers['Authorization'] = `Bearer ${token}`

                const res = await fetch('/api/upload?type=download&duration=3600', { headers })
                if (res.ok) {
                    const data = await res.json()
                    setDownloadToken(data.authorizationToken)
                    if (data.downloadUrl) setDownloadUrl(data.downloadUrl)
                    if (data.bucketName) setActiveBucketName(data.bucketName)
                }
            } catch (err) { console.error(err) }
        }
        fetchToken()
        const interval = setInterval(fetchToken, 50 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    // ============================================================
    // B2-ONLY: Save to server (returns success/failure)
    // No localStorage, no isServerSynced check
    // ============================================================
    const saveToServer = useCallback(async (newStreamers: Streamer[], newVideos: Video[]): Promise<boolean> => {
        try {
            const adminToken = typeof window !== 'undefined'
                ? (localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'))
                : null
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }

            if (adminToken) {
                headers['x-admin-token'] = adminToken
            } else {
                const token = getAuthToken()
                if (token) headers['Authorization'] = `Bearer ${token}`
            }

            const res = await fetch('/api/db', {
                method: 'POST',
                headers,
                body: JSON.stringify({ streamers: newStreamers, videos: newVideos })
            })

            if (!res.ok) {
                const errText = await res.text().catch(() => 'Unknown error')
                console.error(`❌ Server save failed (${res.status}):`, errText)
                setLastError(`저장 실패: ${res.status}`)
                return false
            }

            console.log(`✅ Saved to B2: ${newStreamers.length} streamers, ${newVideos.length} videos`)
            setLastError(null)
            return true
        } catch (e) {
            console.error('❌ Server save error:', e)
            setLastError('서버 저장 실패')
            return false
        }
    }, [])

    // ============================================================
    // Admin Actions: Save to B2 FIRST, then update state
    // If save fails, state is NOT updated (prevents desync)
    // ============================================================

    const addStreamer = useCallback(async (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt' | 'followers'>): Promise<boolean> => {
        const newStreamer: Streamer = {
            ...streamer,
            id: Date.now().toString(),
            videoCount: 0,
            followers: 0,
            createdAt: new Date().toISOString().split('T')[0],
        }
        const newStreamers = [...streamers, newStreamer]
        const saved = await saveToServer(newStreamers, videos)
        if (saved) {
            setStreamers(newStreamers)
        }
        return saved
    }, [streamers, videos, saveToServer])

    const removeStreamer = useCallback(async (id: string): Promise<boolean> => {
        const newStreamers = streamers.filter(s => s.id !== id)
        const newVideos = videos.filter(v => v.streamerId !== id)
        const saved = await saveToServer(newStreamers, newVideos)
        if (saved) {
            setStreamers(newStreamers)
            setVideos(newVideos)
        }
        return saved
    }, [streamers, videos, saveToServer])

    const addVideo = useCallback(async (video: Omit<Video, 'id' | 'createdAt'>): Promise<boolean> => {
        const newVideo: Video = {
            ...video,
            id: Date.now().toString(),
            createdAt: new Date().toISOString().split('T')[0],
        }
        const newStreamers = streamers.map(s =>
            s.id === video.streamerId
                ? { ...s, videoCount: s.videoCount + 1 }
                : s
        )
        const newVideos = [newVideo, ...videos]

        const saved = await saveToServer(newStreamers, newVideos)
        if (saved) {
            setStreamers(newStreamers)
            setVideos(newVideos)
        }
        return saved
    }, [streamers, videos, saveToServer])

    const removeVideo = useCallback(async (id: string): Promise<boolean> => {
        const target = videos.find(v => v.id === id)
        if (!target) return false

        const newStreamers = streamers.map(s =>
            s.id === target.streamerId
                ? { ...s, videoCount: Math.max(0, s.videoCount - 1) }
                : s
        )
        const newVideos = videos.filter(v => v.id !== id)

        const saved = await saveToServer(newStreamers, newVideos)
        if (saved) {
            setStreamers(newStreamers)
            setVideos(newVideos)
        }
        return saved
    }, [streamers, videos, saveToServer])

    const updateStreamer = useCallback(async (id: string, data: Partial<Streamer>): Promise<boolean> => {
        const newStreamers = streamers.map(s => s.id === id ? { ...s, ...data } : s)
        const saved = await saveToServer(newStreamers, videos)
        if (saved) {
            setStreamers(newStreamers)
        }
        return saved
    }, [streamers, videos, saveToServer])

    const updateVideo = useCallback(async (id: string, data: Partial<Video>): Promise<boolean> => {
        const newVideos = videos.map(v => v.id === id ? { ...v, ...data } : v)

        // 스트리머 변경 시 videoCount 조정
        let newStreamers = streamers
        if (data.streamerId) {
            const oldVideo = videos.find(v => v.id === id)
            if (oldVideo && oldVideo.streamerId !== data.streamerId) {
                newStreamers = streamers.map(s => {
                    if (s.id === oldVideo.streamerId) return { ...s, videoCount: Math.max(0, s.videoCount - 1) }
                    if (s.id === data.streamerId) return { ...s, videoCount: s.videoCount + 1 }
                    return s
                })
            }
        }

        const saved = await saveToServer(newStreamers, newVideos)
        if (saved) {
            setVideos(newVideos)
            if (newStreamers !== streamers) setStreamers(newStreamers)
        }
        return saved
    }, [streamers, videos, saveToServer])

    // ============================================================
    // Non-admin actions: views/likes via /api/stats (lightweight)
    // Update local state immediately, sync to server in background
    // ============================================================

    const incrementVideoView = useCallback((videoId: string) => {
        // Update local state immediately for UI responsiveness
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, views: v.views + 1 } : v))

        // Sync to server in background (non-blocking, no admin token needed)
        fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, action: 'view' })
        }).catch(e => console.error('Stats sync failed:', e))
    }, [])

    const toggleVideoLike = useCallback((videoId: string, isLiked: boolean) => {
        // Update local state immediately
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: v.likes + (isLiked ? 1 : -1) } : v))

        // Sync to server in background
        fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, action: isLiked ? 'like' : 'unlike' })
        }).catch(e => console.error('Stats sync failed:', e))
    }, [])

    const toggleStreamerFollow = useCallback((streamerId: string, isFollowed: boolean) => {
        // Update local state immediately
        setStreamers(prev => prev.map(s => s.id === streamerId ? { ...s, followers: Math.max(0, (s.followers || 0) + (isFollowed ? 1 : -1)) } : s))

        // Sync to server in background
        fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamerId, action: isFollowed ? 'follow_streamer' : 'unfollow_streamer' })
        }).catch(e => console.error('Streamer follow sync failed:', e))
    }, [])

    const getStreamerVideos = useCallback((streamerId: string) => videos.filter(v => v.streamerId === streamerId), [videos])
    const getStreamerById = useCallback((id: string) => streamers.find(s => s.id === id), [streamers])

    const importData = useCallback(async (data: { streamers: Streamer[], videos: Video[] }): Promise<boolean> => {
        if (!data.streamers || !data.videos) return false

        const newStreamers = [...streamers]
        data.streamers.forEach(s => {
            if (!newStreamers.find(ex => ex.id === s.id)) {
                newStreamers.push({
                    ...s,
                    followers: s.followers || 0
                })
            }
        })
        const newVideos = [...videos]
        data.videos.forEach(v => {
            if (!newVideos.find(ex => ex.id === v.id)) newVideos.push(v)
        })

        const saved = await saveToServer(newStreamers, newVideos)
        if (saved) {
            setStreamers(newStreamers)
            setVideos(newVideos)
        }
        return saved
    }, [streamers, videos, saveToServer])

    /**
     * Atomic video add - sends only the new video to the server.
     * The server reads the latest DB, appends, and saves.
     * This prevents race conditions during batch uploads.
     */
    const addVideoAtomic = useCallback(async (video: Omit<Video, 'id' | 'createdAt'>): Promise<{ success: boolean; video?: Video }> => {
        try {
            const adminToken = typeof window !== 'undefined'
                ? (localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'))
                : null
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }

            if (adminToken) {
                headers['x-admin-token'] = adminToken
            } else {
                const token = getAuthToken()
                if (token) headers['Authorization'] = `Bearer ${token}`
            }

            const res = await fetch('/api/db/add-video', {
                method: 'POST',
                headers,
                body: JSON.stringify({ video, streamerId: video.streamerId })
            })

            if (!res.ok) {
                const errText = await res.text().catch(() => 'Unknown error')
                console.error(`❌ Atomic addVideo failed (${res.status}):`, errText)
                return { success: false }
            }

            const result = await res.json()
            const newVideo = result.video as Video

            // Update local state to reflect the new video
            setVideos(prev => [newVideo, ...prev])
            setStreamers(prev => prev.map(s =>
                s.id === video.streamerId
                    ? { ...s, videoCount: (s.videoCount || 0) + 1 }
                    : s
            ))

            console.log(`✅ [addVideoAtomic] Added "${newVideo.title}" (total: ${result.totalVideos})`)
            return { success: true, video: newVideo }
        } catch (e) {
            console.error('❌ Atomic addVideo error:', e)
            return { success: false }
        }
    }, [])

    const migrateToB2 = useCallback(async (): Promise<boolean> => {
        return saveToServer(streamers, videos)
    }, [streamers, videos, saveToServer])

    return (
        <StreamerContext.Provider value={{
            streamers,
            videos,
            addStreamer,
            removeStreamer,
            addVideo,
            addVideoAtomic,
            removeVideo,
            incrementVideoView,
            toggleVideoLike,
            toggleStreamerFollow,
            getStreamerVideos,
            getStreamerById,
            importData,
            downloadToken,
            downloadUrl,
            activeBucketName,
            migrateToB2,
            isServerSynced: true,  // Always synced in B2-Only mode
            updateStreamer,
            updateVideo,
            isLoading,
            lastError,
        }}>
            {children}
        </StreamerContext.Provider>
    )
}

export function useStreamers() {
    const context = useContext(StreamerContext)
    if (context === undefined) {
        throw new Error('useStreamers must be used within a StreamerProvider')
    }
    return context
}
