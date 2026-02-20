'use client'

import VideoCard from '@/components/VideoCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useStreamers } from '@/contexts/StreamerContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useState, useMemo, useEffect } from 'react'
import { Video, Streamer } from '@/data/initialData'
import { getMediaUrl } from '@/utils/b2url'

const VIDEOS_PER_PAGE = 24

interface HomeClientProps {
    ssrVideos: Video[]
    ssrStreamers: Streamer[]
}

export default function HomeClient({ ssrVideos, ssrStreamers }: HomeClientProps) {
    const t = useTranslations('membership')
    const tCommon = useTranslations('common')
    const { videos: contextVideos, streamers: contextStreamers, isLoading, downloadToken, downloadUrl, activeBucketName } = useStreamers()
    const { incrementVisit, settings } = useSiteSettings()
    const [sortBy, setSortBy] = useState<'popular' | 'newest'>('newest')
    const [filterBy, setFilterBy] = useState<'all' | 'trending' | 'new'>('all')
    const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE)

    // Use context data once loaded, fallback to SSR data
    const rawVideos = !isLoading && contextVideos.length > 0 ? contextVideos : ssrVideos
    const streamers = !isLoading && contextStreamers.length > 0 ? contextStreamers : ssrStreamers

    useEffect(() => {
        incrementVisit()
    }, [incrementVisit])

    const sortedVideos = useMemo(() => {
        let v = [...rawVideos]

        // Apply filter
        if (filterBy === 'trending') {
            v = v.sort((a, b) => (b.views || 0) - (a.views || 0))
        } else if (filterBy === 'new') {
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 14)
            v = v.filter(video => {
                const created = new Date(video.createdAt || 0)
                return created >= oneWeekAgo
            })
        }

        // Apply sort
        if (sortBy === 'newest') {
            return v.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime()
                const dateB = new Date(b.createdAt || 0).getTime()
                return dateB - dateA
            })
        }
        // Numeric popularity sort
        return v.sort((a, b) => (b.views || 0) - (a.views || 0))
    }, [rawVideos, sortBy, filterBy])

    const videosToShow = sortedVideos.slice(0, visibleCount)
    const hasMore = visibleCount < sortedVideos.length

    // Dynamic stats
    const videoCount = rawVideos.length
    const creatorCount = streamers.length

    const formatCount = (num: number) => {
        if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K+`
        return `${num}+`
    }

    // Popular streamers: sorted by followers descending
    const popularStreamers = useMemo(() => {
        return [...streamers].sort((a, b) => (b.followers || 0) - (a.followers || 0))
    }, [streamers])

    return (
        <>
            {/* Hero Section */}
            <section className="px-6 lg:px-10 py-20 flex flex-col items-center justify-center text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-5xl lg:text-7xl font-extrabold mb-8 tracking-tighter leading-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        {t('title')}
                    </h1>
                    <p className="text-xl lg:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto font-light whitespace-pre-line">
                        {t('subtitle')}
                    </p>

                    {/* Stats centered - Dynamic */}
                    <div className="flex flex-wrap justify-center gap-16 mb-16">
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">{formatCount(videoCount)}</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">{tCommon('videos')}</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">{formatCount(creatorCount)}</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">{tCommon('actors')}</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">∞</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">{t('vipAccess')}</div>
                        </div>
                    </div>

                    <Link
                        href="/membership"
                        className="inline-block gradient-button text-black px-14 py-6 rounded-full font-bold text-2xl animate-pulse-glow shadow-[0_10px_40px_rgba(0,255,136,0.4)] hover:shadow-[0_10px_60px_rgba(0,255,136,0.6)] transition-all transform hover:-translate-y-1"
                    >
                        {t('getStarted')}
                    </Link>
                </div>
            </section>

            {/* Filters */}
            <section className="px-6 lg:px-10 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFilterBy('all')}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterBy === 'all' ? 'bg-accent-primary text-black' : 'bg-bg-secondary hover:bg-bg-tertiary'}`}
                        >
                            {tCommon('videos')}
                        </button>
                        <button
                            onClick={() => { setFilterBy('trending'); setSortBy('popular') }}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterBy === 'trending' ? 'bg-accent-primary text-black' : 'bg-bg-secondary hover:bg-bg-tertiary'}`}
                        >
                            🔥 Trending
                        </button>
                        <button
                            onClick={() => { setFilterBy('new'); setSortBy('newest') }}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterBy === 'new' ? 'bg-accent-primary text-black' : 'bg-bg-secondary hover:bg-bg-tertiary'}`}
                        >
                            ✨ New Releases
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-text-secondary text-sm">Sort:</span>
                        <button
                            onClick={() => setSortBy('popular')}
                            className={`px-4 py-2 border rounded-full text-sm transition-all ${sortBy === 'popular' ? 'border-accent-primary text-accent-primary' : 'border-text-secondary text-text-secondary hover:border-white hover:text-white'}`}
                        >
                            Most Popular
                        </button>
                        <button
                            onClick={() => setSortBy('newest')}
                            className={`px-4 py-2 border rounded-full text-sm transition-all ${sortBy === 'newest' ? 'border-accent-primary text-accent-primary' : 'border-text-secondary text-text-secondary hover:border-white hover:text-white'}`}
                        >
                            Newest
                        </button>
                        <Link
                            href="/videos"
                            className="px-4 py-2 border border-text-secondary text-text-secondary rounded-full text-sm transition-all hover:border-accent-primary hover:text-accent-primary flex items-center gap-1"
                        >
                            All View <span className="text-base">›</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Video Grid */}
            <section className="px-6 lg:px-10 py-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 max-w-[1800px] mx-auto">
                    {videosToShow.map((video) => (
                        <VideoCard
                            key={video.id}
                            id={video.id}
                            title={video.title}
                            creator={(() => { const s = streamers.find(st => st.name === video.streamerName); return s?.koreanName ? `${video.streamerName} (${s.koreanName})` : video.streamerName; })()}
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
                            orientation={video.orientation}
                        />
                    ))}
                </div>
            </section>

            {/* Popular Streamers Section */}
            {popularStreamers.length > 0 && (
                <section className="px-6 lg:px-10 py-8">
                    <div className="max-w-[1800px] mx-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">🔥</span> Popular Creators
                            </h2>
                            <Link
                                href="/actors"
                                className="text-sm text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1 font-medium"
                            >
                                All View <span className="text-lg">›</span>
                            </Link>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {popularStreamers.map((streamer) => (
                                <Link
                                    key={streamer.id}
                                    href={`/actors/${streamer.id}`}
                                    className="group flex-shrink-0"
                                    style={{ width: 'clamp(120px, 14vw, 180px)' }}
                                >
                                    <div className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br ${streamer.gradient} card-hover`}>
                                        {/* Follower Badge */}
                                        {(streamer.followers || 0) > 0 && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-pink-500/90 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5 z-10">
                                                ♥ {streamer.followers >= 10000 ? `${(streamer.followers / 10000).toFixed(1)}만` : streamer.followers >= 1000 ? `${(streamer.followers / 1000).toFixed(1)}K` : streamer.followers}
                                            </div>
                                        )}
                                        {/* Profile Image */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                            {streamer.profileImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={getMediaUrl({
                                                        url: streamer.profileImage,
                                                        token: downloadToken,
                                                        activeBucketName,
                                                        downloadUrl
                                                    })}
                                                    alt={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                    }}
                                                />
                                            ) : null}
                                            <span className={`text-5xl opacity-50 absolute ${streamer.profileImage ? 'hidden' : ''}`}>👤</span>
                                        </div>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                            <span className="text-white text-xs font-bold border border-white px-3 py-1.5 rounded-full">
                                                View
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-white text-sm font-medium truncate group-hover:text-accent-primary transition-colors">
                                            {streamer.name}
                                        </p>
                                        {streamer.koreanName && (
                                            <p className="text-text-secondary text-xs truncate">{streamer.koreanName}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    )
}
