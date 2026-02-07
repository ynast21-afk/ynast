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
    getStreamerVideos: (streamerId: string) => Video[]
    getStreamerById: (id: string) => Streamer | undefined
    downloadToken: string | null
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined)


export function StreamerProvider({ children }: { children: ReactNode }) {
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [videos, setVideos] = useState<Video[]>([])
    const [downloadToken, setDownloadToken] = useState<string | null>(null)

    // Load from localStorage
    useEffect(() => {
        const savedStreamers = localStorage.getItem('streamers')
        const savedVideos = localStorage.getItem('videos')

        console.log('--- StreamerProvider Sync ---')
        console.log('Saved Streamers (Raw):', savedStreamers?.substring(0, 100))
        console.log('Saved Videos (Raw):', savedVideos?.substring(0, 100))

        if (savedStreamers) {
            const parsed = JSON.parse(savedStreamers)
            // Merge initial with saved (prefer saved for user additions)
            const combined = [...initialStreamers]
            parsed.forEach((s: Streamer) => {
                const existingIndex = combined.findIndex(c => c.id === s.id)
                if (existingIndex !== -1) {
                    // Update existing with saved version (if newer or modified)
                    combined[existingIndex] = { ...combined[existingIndex], ...s }
                } else {
                    combined.push(s)
                }
            })
            console.log('Streamers after merge:', combined.length)
            setStreamers(combined)
        } else {
            console.log('No saved streamers, using initial')
            setStreamers(initialStreamers)
        }

        if (savedVideos) {
            try {
                const parsed = JSON.parse(savedVideos)
                console.log('Parsed saved videos:', parsed.length)
                const combined = [...initialVideos]
                parsed.forEach((v: Video) => {
                    const existingIndex = combined.findIndex(c => c.id === v.id)
                    if (existingIndex !== -1) {
                        combined[existingIndex] = { ...combined[existingIndex], ...v }
                    } else {
                        combined.push(v)
                    }
                })
                console.log('Videos after merge:', combined.length)
                setVideos(combined)
            } catch (e) {
                console.error('Failed to parse saved videos:', e)
                setVideos(initialVideos)
            }
        } else {
            console.log('No saved videos key "videos" found in localStorage, using initial')
            setVideos(initialVideos)
        }
    }, [])

    // Fetch session-wide B2 Download Authorization
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/upload?type=download&duration=3600')
                if (res.ok) {
                    const data = await res.json()
                    setDownloadToken(data.authorizationToken)
                    console.log('Global B2 Download Token Sync SUCCESS')
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
        if (streamers.length > 0) {
            console.log('Saving streamers to localStorage:', streamers.length)
            localStorage.setItem('streamers', JSON.stringify(streamers))
        } else {
            console.log('Streamers empty, skipping save to avoid wipe')
        }
    }, [streamers])

    useEffect(() => {
        if (videos.length > 0) {
            console.log('Saving videos to localStorage:', videos.length)
            localStorage.setItem('videos', JSON.stringify(videos))
        } else {
            console.log('Videos empty, skipping save to avoid wipe')
        }
    }, [videos])

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

    const getStreamerVideos = (streamerId: string) => {
        return videos.filter(v => v.streamerId === streamerId)
    }

    const getStreamerById = (id: string) => {
        return streamers.find(s => s.id === id)
    }

    return (
        <StreamerContext.Provider value={{
            streamers,
            videos,
            addStreamer,
            removeStreamer,
            addVideo,
            removeVideo,
            getStreamerVideos,
            getStreamerById,
            downloadToken,
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
