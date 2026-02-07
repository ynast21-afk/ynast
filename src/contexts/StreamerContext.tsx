'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined)


export function StreamerProvider({ children }: { children: ReactNode }) {
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [videos, setVideos] = useState<Video[]>([])
    const [downloadToken, setDownloadToken] = useState<string | null>(null)
    const [activeBucketName, setActiveBucketName] = useState<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage
    useEffect(() => {
        const isInitialized = localStorage.getItem('data_initialized')
        const savedStreamers = localStorage.getItem('streamers')
        const savedVideos = localStorage.getItem('videos')

        console.log('--- StreamerProvider Init ---')

        if (isInitialized) {
            console.log('App already initialized. Loading user data...')
            // Load Streamers
            if (savedStreamers) {
                try {
                    setStreamers(JSON.parse(savedStreamers))
                } catch (e) {
                    console.error('Failed to parse streamers', e)
                    setStreamers([])
                }
            } else {
                setStreamers([]) // User deleted everything
            }

            // Load Videos
            if (savedVideos) {
                try {
                    setVideos(JSON.parse(savedVideos))
                } catch (e) {
                    console.error('Failed to parse videos', e)
                    setVideos([])
                }
            } else {
                setVideos([]) // User deleted everything
            }
        } else {
            console.log('First run detected. Seeding initial data...')
            setStreamers(initialStreamers)
            setVideos(initialVideos)
            localStorage.setItem('data_initialized', 'true')
        }

        setIsLoaded(true)
    }, [])

    // Fetch session-wide B2 Download Authorization
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/upload?type=download&duration=3600')
                if (res.ok) {
                    const data = await res.json()
                    setDownloadToken(data.authorizationToken)
                    if (data.bucketName) {
                        setActiveBucketName(data.bucketName)
                    }
                    console.log('Global B2 Download Token Sync SUCCESS', { bucket: data.bucketName })
                }
            } catch (err) {
                console.error('Failed to get global B2 token:', err)
            }
        }
        fetchToken()
        // Refresh every 50 minutes
        const interval = setInterval(fetchToken, 50 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    // Save to localStorage
    useEffect(() => {
        if (!isLoaded) return
        console.log('Saving streamers to localStorage:', streamers.length)
        localStorage.setItem('streamers', JSON.stringify(streamers))
    }, [streamers, isLoaded])

    useEffect(() => {
        if (!isLoaded) return
        console.log('Saving videos to localStorage:', videos.length)
        localStorage.setItem('videos', JSON.stringify(videos))
    }, [videos, isLoaded])

    const addStreamer = (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt'>) => {
        const newStreamer: Streamer = {
            ...streamer,
            id: Date.now().toString(),
            videoCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
        }
        setStreamers([...streamers, newStreamer])
    }

    const removeStreamer = (id: string) => {
        setStreamers(streamers.filter(s => s.id !== id))
        // 해당 스트리머의 비디오도 삭제
        setVideos(videos.filter(v => v.streamerId !== id))
    }

    const addVideo = (video: Omit<Video, 'id' | 'createdAt'>) => {
        const newVideo: Video = {
            ...video,
            id: Date.now().toString(),
            createdAt: new Date().toISOString().split('T')[0],
        }
        setVideos([newVideo, ...videos]) // 최신순으로 맨 앞에 추가

        // 스트리머 비디오 수 증가
        setStreamers(streamers.map(s =>
            s.id === video.streamerId
                ? { ...s, videoCount: s.videoCount + 1 }
                : s
        ))
    }

    const removeVideo = (id: string) => {
        const video = videos.find(v => v.id === id)
        if (video) {
            setVideos(videos.filter(v => v.id !== id))
            // 스트리머 비디오 수 감소
            setStreamers(streamers.map(s =>
                s.id === video.streamerId
                    ? { ...s, videoCount: Math.max(0, s.videoCount - 1) }
                    : s
            ))
        }
    }

    const incrementVideoView = (videoId: string) => {
        setVideos(prev => prev.map(v =>
            v.id === videoId ? { ...v, views: v.views + 1 } : v
        ))
    }

    const toggleVideoLike = (videoId: string, isLiked: boolean) => {
        setVideos(prev => prev.map(v =>
            v.id === videoId ? { ...v, likes: v.likes + (isLiked ? 1 : -1) } : v
        ))
    }

    const getStreamerVideos = (streamerId: string) => {
        return videos.filter(v => v.streamerId === streamerId)
    }

    const getStreamerById = (id: string) => {
        return streamers.find(s => s.id === id)
    }

    const importData = (data: { streamers: Streamer[], videos: Video[] }) => {
        if (!data.streamers || !data.videos) {
            console.error('Invalid import data structure')
            return false
        }

        // Merge streamers
        setStreamers(prev => {
            const combined = [...prev]
            data.streamers.forEach(s => {
                const index = combined.findIndex(item => item.id === s.id)
                if (index !== -1) combined[index] = s
                else combined.push(s)
            })
            return combined
        })

        // Merge videos
        setVideos(prev => {
            const combined = [...prev]
            data.videos.forEach(v => {
                const index = combined.findIndex(item => item.id === v.id)
                if (index !== -1) combined[index] = v
                else combined.push(v)
            })
            return combined
        })
        return true
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
            activeBucketName
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
