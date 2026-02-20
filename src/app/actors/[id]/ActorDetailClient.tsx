'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'
import { useStreamers } from '@/contexts/StreamerContext'
import { Video } from '@/data/initialData'
import { useAuth } from '@/contexts/AuthContext'
import { hasAccess } from '@/utils/membership'
import { getMediaUrl } from '@/utils/b2url'
import { useTranslations } from 'next-intl'

// Sub-component for the videos grid with filters
function VideosByActor({ videos, streamerName, koreanName }: { videos: any[]; streamerName: string; koreanName?: string }) {
    const t = useTranslations('videoPages')
    const tCommon = useTranslations('common')
    const [orientationFilter, setOrientationFilter] = useState<'all' | 'horizontal' | 'vertical'>('all')
    const [sort, setSort] = useState<'latest' | 'popular'>('latest')

    const filteredVideos = useMemo(() => {
        let filtered = [...videos]
        if (orientationFilter === 'horizontal') {
            filtered = filtered.filter(v => (v.orientation || 'horizontal') !== 'vertical')
        } else if (orientationFilter === 'vertical') {
            filtered = filtered.filter(v => v.orientation === 'vertical')
        }

        filtered.sort((a, b) => {
            if (sort === 'latest') {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            }
            return (b.views || 0) - (a.views || 0)
        })

        return filtered
    }, [videos, orientationFilter, sort])

    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">{t('videosBy', { name: streamerName })}</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Orientation Filter */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setOrientationFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${orientationFilter === 'all'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                }`}
                        >
                            {tCommon('all')}
                        </button>
                        <button
                            onClick={() => setOrientationFilter('horizontal')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${orientationFilter === 'horizontal'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                }`}
                        >
                            📺 {t('horizontal')}
                        </button>
                        <button
                            onClick={() => setOrientationFilter('vertical')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${orientationFilter === 'vertical'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                }`}
                        >
                            📱 {t('vertical')}
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">{t('sort')}:</span>
                        <button
                            onClick={() => setSort('latest')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${sort === 'latest'
                                ? 'border-2 border-accent-primary text-accent-primary'
                                : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                }`}
                        >
                            {t('latest')}
                        </button>
                        <button
                            onClick={() => setSort('popular')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${sort === 'popular'
                                ? 'border-2 border-accent-primary text-accent-primary'
                                : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                }`}
                        >
                            {t('popular')}
                        </button>
                    </div>
                </div>
            </div>

            {filteredVideos.length === 0 ? (
                <div className="text-center py-20 bg-bg-secondary rounded-2xl">
                    <span className="text-6xl mb-4 block">📹</span>
                    <h3 className="text-xl font-bold mb-2">{t('noVideosTitle')}</h3>
                    <p className="text-text-secondary">
                        {orientationFilter !== 'all'
                            ? t('noVideosFilter', { orientation: orientationFilter })
                            : t('noVideosDefault')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                    {filteredVideos.map((video: any) => (
                        <VideoCard
                            key={video.id}
                            id={video.id}
                            title={video.title}
                            creator={koreanName ? `${video.streamerName} (${koreanName})` : video.streamerName}
                            views={video.views}
                            duration={video.duration}
                            isVip={video.isVip}
                            gradient={video.gradient}
                            videoUrl={video.videoUrl}
                            thumbnailUrl={video.thumbnailUrl}
                            uploadedAt={video.uploadedAt}
                            createdAt={video.createdAt}
                            previewUrls={video.previewUrls}
                            minStreamingLevel={video.minStreamingLevel}
                            minDownloadLevel={video.minDownloadLevel}
                            aspectRatio="video"
                            orientation={video.orientation}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

// Helper to generate token for API calls
function getToken(user: any) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(user))))
    } catch (e) {
        return ''
    }
}

interface ActorDetailClientProps {
    streamer: any
    videos: any[]
    downloadToken: string | null
}

export default function ActorDetailClient({ streamer, videos, downloadToken: serverToken }: ActorDetailClientProps) {
    const t = useTranslations('actorPage')
    const tVideo = useTranslations('videoPages')
    const { downloadToken: clientToken, downloadUrl, activeBucketName, toggleStreamerFollow } = useStreamers()
    const { user } = useAuth()
    const videoRef = useRef<HTMLVideoElement>(null)
    const downloadToken = serverToken || clientToken

    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(streamer.followers || 0)

    useEffect(() => {
        // 1. Load from localStorage cache first (instant)
        const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
        if (savedFollows) {
            const followedIds = JSON.parse(savedFollows)
            if (followedIds.includes(streamer.id)) {
                setIsFollowing(true)
            }
        }

        // 2. Load from B2 server (async)
        if (user) {
            const token = getToken(user)
            if (token) {
                fetch('/api/user/social', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.follows) {
                            setIsFollowing(data.follows.includes(streamer.id))
                            localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(data.follows))
                        }
                    })
                    .catch(err => console.error('Failed to load follows from server:', err))
            }
        }
    }, [streamer.id, user])

    const handleFollow = () => {
        if (!user) {
            alert(t('loginToFollow'))
            return
        }

        const newFollowingState = !isFollowing

        // Optimistic UI update
        setIsFollowing(newFollowingState)
        setFollowerCount((prev: number) => Math.max(0, prev + (newFollowingState ? 1 : -1)))

        // 1. Update User's Follow List (Local + B2 /api/user/social)
        const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
        let followedIds = savedFollows ? JSON.parse(savedFollows) : []

        if (newFollowingState) {
            followedIds.push(streamer.id)
        } else {
            followedIds = followedIds.filter((id: string) => id !== streamer.id)
        }
        localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(followedIds))

        const token = getToken(user)
        if (token) {
            fetch('/api/user/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type: 'follow', action: newFollowingState ? 'add' : 'remove', targetId: streamer.id })
            }).catch(err => console.error('Failed to sync follow:', err))
        }

        // 2. Update Streamer's Total Follower Count (Context -> /api/stats)
        toggleStreamerFollow(streamer.id, newFollowingState)
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 {tVideo('breadcrumbHome')}</Link>
                        <span>›</span>
                        <Link href="/actors" className="hover:text-accent-primary">{tVideo('breadcrumbActors') || 'Actors'}</Link>
                        <span>›</span>
                        <span className="text-white">{streamer.name}</span>
                    </nav>

                    {/* Streamer Profile Header */}
                    <div className="flex items-center gap-6 mb-8 p-6 bg-bg-secondary rounded-2xl border border-white/10">
                        {/* Profile Image */}
                        <div className={`relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${streamer.gradient}`}>
                            {streamer.profileImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={getMediaUrl({
                                        url: streamer.profileImage,
                                        token: downloadToken,
                                        activeBucketName,
                                        downloadUrl
                                    })}
                                    alt={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} dance - kStreamer dance creator`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl">👤</span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-1">{streamer.name}</h1>
                                    {streamer.koreanName && (
                                        <p className="text-text-secondary text-lg mb-2">{streamer.koreanName}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${isFollowing
                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                        : 'bg-accent-primary text-black hover:bg-accent-secondary shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                                        }`}
                                >
                                    {isFollowing ? (
                                        <>
                                            <span>✓</span>
                                            <span>{t('following')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>+</span>
                                            <span>{t('follow')}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-sm mt-2">
                                <span className="text-white/80 font-medium flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{followerCount.toLocaleString()}</span>
                                    <span className="text-text-secondary font-normal">{t('followers')}</span>
                                </span>
                                <span className="text-accent-primary font-medium">
                                    🎬 {t('videos', { count: streamer.videoCount })}
                                </span>
                                <span className="text-text-secondary">
                                    {t('joined', { date: streamer.createdAt })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Videos Section */}
                    <VideosByActor videos={videos} streamerName={streamer.name} koreanName={streamer.koreanName} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
