'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'

import { Streamer, Video, initialStreamers, initialVideos } from '@/data/initialData'

interface StreamerContextType {
    streamers: Streamer[]
    videos: Video[]
    addStreamer: (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt'>) => void
    removeStreamer: (id: string) => void
    addVideo: (video: Omit<Video, 'id' | 'createdAt'>) => void
    removeVideo: (id: string) => void
    incrementVideoView: (videoId: string) => void
    toggleVideoLike: (videoId: string, isLiked: boolean) => void
    getStreamerVideos: (streamerId: string) => Video[]
    getStreamerById: (id: string) => Streamer | undefined
    importData: (data: { streamers: Streamer[], videos: Video[] }) => boolean
    downloadToken: string | null
    activeBucketName: string | null
    migrateToB2: () => Promise<boolean>
    isServerSynced: boolean
    updateStreamer: (id: string, data: Partial<Streamer>) => void
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined)


export function StreamerProvider({ children }: { children: ReactNode }) {
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [videos, setVideos] = useState<Video[]>([])
    const [downloadToken, setDownloadToken] = useState<string | null>(null)
    const [activeBucketName, setActiveBucketName] = useState<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isServerSynced, setIsServerSynced] = useState(false)

    // Use refs to access latest state in async operations without dependency cycles
    const stateRef = useRef({ streamers, videos })
    useEffect(() => {
        stateRef.current = { streamers, videos }
    }, [streamers, videos])

    // Load Data (Server First -> Local Fallback)
    useEffect(() => {
        const initData = async () => {
            console.log('--- StreamerProvider Init ---')
            let loadedFromServer = false

            try {
                // 1. Try Server DB
                const res = await fetch('/api/db', { cache: 'no-store' })
                if (res.ok) {
                    const dbData = await res.json()
                    if (dbData && dbData.streamers && dbData.videos) {
                        console.log('Loaded data from Server DB')
                        setStreamers(dbData.streamers)
                        setVideos(dbData.videos)
                        loadedFromServer = true
                        setIsServerSynced(true)
                    }
                }
            } catch (e) {
                console.error('Failed to load from Server DB', e)
            }

            if (!loadedFromServer) {
                // 2. LocalStorage Fallback
                const isInitialized = localStorage.getItem('data_initialized')
                const savedStreamers = localStorage.getItem('streamers')
                const savedVideos = localStorage.getItem('videos')

                if (isInitialized) {
                    console.log('Loading local user data...')
                    if (savedStreamers) setStreamers(JSON.parse(savedStreamers))
                    if (savedVideos) setVideos(JSON.parse(savedVideos))
                } else {
                    console.log('First run detected. Seeding initial data...')
                    setStreamers(initialStreamers)
                    setVideos(initialVideos)
                    localStorage.setItem('data_initialized', 'true')
                }
            }

            setIsLoaded(true)
        }
        initData()
    }, [])

    // Fetch session-wide B2 Download Authorization (Existing Logic)
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/upload?type=download&duration=3600')
                if (res.ok) {
                    const data = await res.json()
                    setDownloadToken(data.authorizationToken)
                    if (data.bucketName) setActiveBucketName(data.bucketName)
                }
            } catch (err) { console.error(err) }
        }
        fetchToken()
        const interval = setInterval(fetchToken, 50 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    // Auto-Save Logic
    const saveData = async (newStreamers: Streamer[], newVideos: Video[]) => {
        // Always save to LocalStorage as backup/cache
        localStorage.setItem('streamers', JSON.stringify(newStreamers))
        localStorage.setItem('videos', JSON.stringify(newVideos))

        // If we are in "Server Mode" (migrated), sync to B2
        if (isServerSynced) {
            try {
                await fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ streamers: newStreamers, videos: newVideos })
                })
                console.log('Synced to Server DB')
            } catch (e) {
                console.error('Background Sync Failed', e)
            }
        }
    }

    // Helper wrapper to update state and trigger save
    const updateState = (
        updater: (prevS: Streamer[], prevV: Video[]) => { s: Streamer[], v: Video[] }
    ) => {
        const { s, v } = updater(stateRef.current.streamers, stateRef.current.videos)
        setStreamers(s)
        setVideos(v)
        saveData(s, v)
    }

    const addStreamer = (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt'>) => {
        updateState((prevS, prevV) => {
            const newStreamer: Streamer = {
                ...streamer,
                id: Date.now().toString(),
                videoCount: 0,
                createdAt: new Date().toISOString().split('T')[0],
            }
            return { s: [...prevS, newStreamer], v: prevV }
        })
    }

    const removeStreamer = (id: string) => {
        updateState((prevS, prevV) => {
            return {
                s: prevS.filter(s => s.id !== id),
                v: prevV.filter(v => v.streamerId !== id)
            }
        })
    }

    const addVideo = (video: Omit<Video, 'id' | 'createdAt'>) => {
        updateState((prevS, prevV) => {
            const newVideo: Video = {
                ...video,
                id: Date.now().toString(),
                createdAt: new Date().toISOString().split('T')[0],
            }
            // Update Streamer count
            const newStreamers = prevS.map(s =>
                s.id === video.streamerId
                    ? { ...s, videoCount: s.videoCount + 1 }
                    : s
            )
            return { s: newStreamers, v: [newVideo, ...prevV] }
        })
    }

    const removeVideo = (id: string) => {
        updateState((prevS, prevV) => {
            const target = prevV.find(v => v.id === id)
            if (!target) return { s: prevS, v: prevV }

            const newStreamers = prevS.map(s =>
                s.id === target.streamerId
                    ? { ...s, videoCount: Math.max(0, s.videoCount - 1) }
                    : s
            )
            return { s: newStreamers, v: prevV.filter(v => v.id !== id) }
        })
    }

    const incrementVideoView = (videoId: string) => {
        // Optimistic update, but maybe throttle server sync?
        // For simplicity, we sync. It's just a text file.
        updateState((prevS, prevV) => ({
            s: prevS,
            v: prevV.map(v => v.id === videoId ? { ...v, views: v.views + 1 } : v)
        }))
    }

    const toggleVideoLike = (videoId: string, isLiked: boolean) => {
        updateState((prevS, prevV) => ({
            s: prevS,
            v: prevV.map(v => v.id === videoId ? { ...v, likes: v.likes + (isLiked ? 1 : -1) } : v)
        }))
    }

    const updateStreamer = (id: string, data: Partial<Streamer>) => {
        updateState((prevS, prevV) => ({
            s: prevS.map(s => s.id === id ? { ...s, ...data } : s),
            v: prevV
        }))
    }

    const getStreamerVideos = (streamerId: string) => videos.filter(v => v.streamerId === streamerId)
    const getStreamerById = (id: string) => streamers.find(s => s.id === id)

    const importData = (data: { streamers: Streamer[], videos: Video[] }) => {
        if (!data.streamers || !data.videos) return false
        updateState((prevS, prevV) => {
            // Merge logic (simplified)
            // Just replacing or appending? Use previous logic roughly
            // Actually, import usually implies "load backup". Let's merge.
            const newS = [...prevS]
            data.streamers.forEach(s => {
                if (!newS.find(ex => ex.id === s.id)) newS.push(s)
            })
            const newV = [...prevV]
            data.videos.forEach(v => {
                if (!newV.find(ex => ex.id === v.id)) newV.push(v)
            })
            return { s: newS, v: newV }
        })
        return true
    }

    const migrateToB2 = async () => {
        try {
            const res = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ streamers, videos })
            })
            if (res.ok) {
                setIsServerSynced(true)
                return true
            }
            return false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    return (
        <StreamerContext.Provider value={{
            streamers,
            videos,
            addStreamer,
            removeStreamer,
            addVideo,
            removeVideo,
            incrementVideoView,
            toggleVideoLike,
            getStreamerVideos,
            getStreamerById,
            importData,
            downloadToken,
            activeBucketName,
            migrateToB2,
            isServerSynced,
            updateStreamer
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
