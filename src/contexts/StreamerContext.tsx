'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Streamer {
    id: string
    name: string
    koreanName?: string       // 한국어 이름
    profileImage?: string     // 프로필 이미지 URL
    videoCount: number        // 영상 수
    gradient: string          // 배경 그라디언트
    createdAt: string
}

export interface Video {
    id: string
    title: string
    streamerId: string        // 스트리머 ID 연결
    streamerName: string
    views: string
    likes: string
    duration: string
    isVip: boolean
    gradient: string
    uploadedAt: string
    createdAt: string
    videoUrl?: string
}

interface StreamerContextType {
    streamers: Streamer[]
    videos: Video[]
    addStreamer: (streamer: Omit<Streamer, 'id' | 'videoCount' | 'createdAt'>) => void
    removeStreamer: (id: string) => void
    addVideo: (video: Omit<Video, 'id' | 'createdAt'>) => void
    removeVideo: (id: string) => void
    getStreamerVideos: (streamerId: string) => Video[]
    getStreamerById: (id: string) => Streamer | undefined
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined)

// 샘플 스트리머 데이터
const initialStreamers: Streamer[] = [
    { id: '1', name: 'golaniyuie0', koreanName: '고라니', videoCount: 14, gradient: 'from-pink-900 to-purple-900', createdAt: '2026-01-01' },
    { id: '2', name: 'm0m099', koreanName: '모모', videoCount: 13, gradient: 'from-blue-900 to-indigo-900', createdAt: '2026-01-02' },
    { id: '3', name: 'rud9281', koreanName: '루디', videoCount: 12, gradient: 'from-cyan-900 to-teal-900', createdAt: '2026-01-03' },
    { id: '4', name: 'eunyoung1238', koreanName: '은영', videoCount: 8, gradient: 'from-amber-900 to-orange-900', createdAt: '2026-01-04' },
    { id: '5', name: 'smmms2002', koreanName: '썸썸', videoCount: 7, gradient: 'from-rose-900 to-pink-900', createdAt: '2026-01-05' },
    { id: '6', name: 'sonming52', koreanName: '손밍', videoCount: 7, gradient: 'from-violet-900 to-purple-900', createdAt: '2026-01-06' },
    { id: '7', name: 'haumpah', koreanName: '하움파', videoCount: 6, gradient: 'from-emerald-900 to-green-900', createdAt: '2026-01-07' },
    { id: '8', name: 'aiswi2208', koreanName: '아이스위', videoCount: 6, gradient: 'from-slate-900 to-gray-900', createdAt: '2026-01-08' },
    { id: '9', name: 'bumzi98', koreanName: '범지', videoCount: 6, gradient: 'from-orange-900 to-red-900', createdAt: '2026-01-09' },
    { id: '10', name: 'dmsdms1247', koreanName: '은은', videoCount: 5, gradient: 'from-teal-900 to-cyan-900', createdAt: '2026-01-10' },
    { id: '11', name: 'e000e77', koreanName: '이공', videoCount: 5, gradient: 'from-fuchsia-900 to-pink-900', createdAt: '2026-01-11' },
    { id: '12', name: 'milkkim123', koreanName: '밀크킴', videoCount: 5, gradient: 'from-indigo-900 to-blue-900', createdAt: '2026-01-12' },
]

// 샘플 비디오 데이터 (스트리머 연결됨)
const initialVideos: Video[] = [
    { id: '1', title: '2026-02-06_Dance Cover - NewJeans', streamerId: '1', streamerName: 'golaniyuie0', views: '2.8K', likes: '12', duration: '21:36', isVip: true, gradient: 'from-purple-900 to-pink-900', uploadedAt: '1d ago', createdAt: '2026-02-06' },
    { id: '2', title: '2026-02-06_K-Pop Tutorial Vol.1', streamerId: '2', streamerName: 'm0m099', views: '3.4K', likes: '12', duration: '10:03', isVip: true, gradient: 'from-indigo-900 to-blue-900', uploadedAt: '1d ago', createdAt: '2026-02-06' },
    { id: '3', title: '2026-02-05_Freestyle Session', streamerId: '3', streamerName: 'rud9281', views: '2.4K', likes: '13', duration: '44:09', isVip: true, gradient: 'from-cyan-900 to-teal-900', uploadedAt: '1d ago', createdAt: '2026-02-05' },
    { id: '4', title: '2026-02-05_aespa Choreography', streamerId: '4', streamerName: 'eunyoung1238', views: '2.8K', likes: '13', duration: '19:08', isVip: true, gradient: 'from-amber-900 to-orange-900', uploadedAt: '1d ago', createdAt: '2026-02-05' },
    { id: '5', title: '2026-02-04_TWICE Dance Practice', streamerId: '5', streamerName: 'smmms2002', views: '3.5K', likes: '11', duration: '8:22', isVip: true, gradient: 'from-rose-900 to-pink-900', uploadedAt: '2d ago', createdAt: '2026-02-04' },
    { id: '6', title: '2026-02-04_IVE Performance', streamerId: '6', streamerName: 'sonming52', views: '1.7K', likes: '11', duration: '21:19', isVip: true, gradient: 'from-violet-900 to-purple-900', uploadedAt: '2d ago', createdAt: '2026-02-04' },
    { id: '7', title: '2026-02-03_Dance Battle Highlights', streamerId: '7', streamerName: 'haumpah', views: '2.4K', likes: '17', duration: '14:49', isVip: true, gradient: 'from-emerald-900 to-green-900', uploadedAt: '3d ago', createdAt: '2026-02-03' },
    { id: '8', title: '2026-02-03_LE SSERAFIM Cover', streamerId: '8', streamerName: 'aiswi2208', views: '1.7K', likes: '9', duration: '45:01', isVip: true, gradient: 'from-blue-900 to-indigo-900', uploadedAt: '3d ago', createdAt: '2026-02-03' },
    { id: '9', title: '2026-02-02_Blackpink Dance Tutorial', streamerId: '9', streamerName: 'bumzi98', views: '1.1K', likes: '14', duration: '40:56', isVip: true, gradient: 'from-pink-900 to-red-900', uploadedAt: '4d ago', createdAt: '2026-02-02' },
    { id: '10', title: '2026-02-02_Street Dance Basics', streamerId: '10', streamerName: 'dmsdms1247', views: '1.1K', likes: '14', duration: '45:02', isVip: true, gradient: 'from-slate-900 to-gray-900', uploadedAt: '4d ago', createdAt: '2026-02-02' },
    { id: '11', title: '2026-02-01_Hip Hop Foundations', streamerId: '11', streamerName: 'e000e77', views: '933', likes: '14', duration: '1:08:54', isVip: true, gradient: 'from-orange-900 to-amber-900', uploadedAt: '5d ago', createdAt: '2026-02-01' },
    { id: '12', title: '2026-02-01_K-Pop Random Play', streamerId: '12', streamerName: 'milkkim123', views: '1.2K', likes: '13', duration: '20:31', isVip: true, gradient: 'from-teal-900 to-cyan-900', uploadedAt: '5d ago', createdAt: '2026-02-01' },
    { id: '13', title: '2026-01-31_Dance Challenge', streamerId: '1', streamerName: 'golaniyuie0', views: '1.0K', likes: '13', duration: '43:40', isVip: true, gradient: 'from-fuchsia-900 to-pink-900', uploadedAt: '6d ago', createdAt: '2026-01-31' },
    { id: '14', title: '2026-01-31_BTS Choreography', streamerId: '2', streamerName: 'm0m099', views: '1.2K', likes: '13', duration: '27:12', isVip: true, gradient: 'from-purple-900 to-violet-900', uploadedAt: '6d ago', createdAt: '2026-01-31' },
    { id: '15', title: '2026-01-30_Dance Practice Room', streamerId: '3', streamerName: 'rud9281', views: '779', likes: '14', duration: '25:45', isVip: true, gradient: 'from-indigo-900 to-blue-900', uploadedAt: '1w ago', createdAt: '2026-01-30' },
]

export function StreamerProvider({ children }: { children: ReactNode }) {
    const [streamers, setStreamers] = useState<Streamer[]>([])
    const [videos, setVideos] = useState<Video[]>([])

    // Load from localStorage
    useEffect(() => {
        const savedStreamers = localStorage.getItem('streamers')
        const savedVideos = localStorage.getItem('videos')

        if (savedStreamers) {
            setStreamers(JSON.parse(savedStreamers))
        } else {
            setStreamers(initialStreamers)
        }

        if (savedVideos) {
            setVideos(JSON.parse(savedVideos))
        } else {
            setVideos(initialVideos)
        }
    }, [])

    // Save to localStorage
    useEffect(() => {
        if (streamers.length > 0) {
            localStorage.setItem('streamers', JSON.stringify(streamers))
        }
    }, [streamers])

    useEffect(() => {
        if (videos.length > 0) {
            localStorage.setItem('videos', JSON.stringify(videos))
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
