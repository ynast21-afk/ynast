'use client'

import VideoCard from '@/components/VideoCard'
import { useStreamers } from '@/contexts/StreamerContext'
import { useState, useMemo } from 'react'
import { Video } from '@/data/initialData'
import { useTranslations } from 'next-intl'

const VIDEOS_PER_PAGE = 24

interface VideosClientProps {
    ssrVideos: Video[]
}

export default function VideosClient({ ssrVideos }: VideosClientProps) {
    const t = useTranslations('videoPages')
    const tCommon = useTranslations('common')
    const { videos: contextVideos, streamers, isLoading } = useStreamers()
    const [filter, setFilter] = useState<'all' | 'vip' | 'free'>('all')
    const [sort, setSort] = useState<'latest' | 'popular' | 'liked'>('latest')
    const [orientationFilter, setOrientationFilter] = useState<'all' | 'horizontal' | 'vertical'>('all')
    const [streamerFilter, setStreamerFilter] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(1)

    // Use context data once loaded, fallback to SSR data
    const videos = !isLoading && contextVideos.length > 0 ? contextVideos : ssrVideos

    // Unique streamer names for filter
    const streamerNames = useMemo(() => {
        return Array.from(new Set(videos.map(v => v.streamerName).filter(Boolean))) as string[]
    }, [videos])

    // Filter videos
    const filteredVideos = videos.filter(video => {
        if (filter === 'vip' && !video.isVip) return false
        if (filter === 'free' && video.isVip) return false
        if (orientationFilter === 'horizontal' && video.orientation === 'vertical') return false
        if (orientationFilter === 'vertical' && (video.orientation || 'horizontal') !== 'vertical') return false
        if (streamerFilter && video.streamerName !== streamerFilter) return false
        return true
    })

    // Sort videos
    const sortedVideos = useMemo(() => {
        const sorted = [...filteredVideos].sort((a, b) => {
            if (sort === 'latest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
            if (sort === 'popular') {
                return (b.views || 0) - (a.views || 0)
            }
            if (sort === 'liked') {
                return (b.likes || 0) - (a.likes || 0)
            }
            return 0
        })
        return sorted
    }, [filteredVideos, sort])

    // Pagination
    const totalPages = Math.ceil(sortedVideos.length / VIDEOS_PER_PAGE)
    const paginatedVideos = sortedVideos.slice(
        (currentPage - 1) * VIDEOS_PER_PAGE,
        currentPage * VIDEOS_PER_PAGE
    )

    // Reset page when filter/sort changes
    const handleFilterChange = (newFilter: typeof filter) => {
        setFilter(newFilter)
        setCurrentPage(1)
    }

    const handleSortChange = (newSort: typeof sort) => {
        setSort(newSort)
        setCurrentPage(1)
    }

    const handleOrientationChange = (newOrientation: typeof orientationFilter) => {
        setOrientationFilter(newOrientation)
        setCurrentPage(1)
    }

    const handleStreamerChange = (streamer: string) => {
        setStreamerFilter(streamer)
        setCurrentPage(1)
    }

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | '...')[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (currentPage > 3) pages.push('...')
            const start = Math.max(2, currentPage - 1)
            const end = Math.min(totalPages - 1, currentPage + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (currentPage < totalPages - 2) pages.push('...')
            pages.push(totalPages)
        }
        return pages
    }

    return (
        <>
            {/* Title & Filters */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{t('allVideos')}</h1>
                        <p className="text-text-secondary text-sm">{t('videosAvailable', { count: filteredVideos.length })}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Streamer Filter */}
                        <select
                            value={streamerFilter}
                            onChange={(e) => handleStreamerChange(e.target.value)}
                            className="px-4 py-2 rounded-full text-sm font-medium bg-bg-secondary border border-white/10 text-white focus:border-accent-primary outline-none"
                        >
                            <option value="">{t('allCreators')}</option>
                            {streamerNames.map(name => {
                                // Find streamer by name to get Korean name
                                const streamer = streamers.find(s => s.name === name)
                                const displayName = streamer?.koreanName ? `${name} (${streamer.koreanName})` : name
                                return (
                                    <option key={name} value={name}>{displayName}</option>
                                )
                            })}
                        </select>

                        {/* Orientation Filter */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => handleOrientationChange('all')}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${orientationFilter === 'all'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                    }`}
                            >
                                {tCommon('all')}
                            </button>
                            <button
                                onClick={() => handleOrientationChange('horizontal')}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${orientationFilter === 'horizontal'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                    }`}
                            >
                                📺 {t('horizontal')}
                            </button>
                            <button
                                onClick={() => handleOrientationChange('vertical')}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${orientationFilter === 'vertical'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
                                    }`}
                            >
                                📱 {t('vertical')}
                            </button>
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleFilterChange('all')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-accent-primary text-black'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary'
                                    }`}
                            >
                                {tCommon('all')}
                            </button>
                            <button
                                onClick={() => handleFilterChange('vip')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'vip'
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary'
                                    }`}
                            >
                                🏆 {t('vipOnly')}
                            </button>
                            <button
                                onClick={() => handleFilterChange('free')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'free'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-bg-secondary hover:bg-bg-tertiary'
                                    }`}
                            >
                                {t('free')}
                            </button>
                        </div>

                        {/* Sort Buttons */}
                        <div className="flex gap-2">
                            <span className="text-text-secondary text-sm px-2">{t('sort')}:</span>
                            <button
                                onClick={() => handleSortChange('latest')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'latest'
                                    ? 'border-2 border-accent-primary text-accent-primary'
                                    : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                    }`}
                            >
                                ⏰ {t('latest')}
                            </button>
                            <button
                                onClick={() => handleSortChange('popular')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'popular'
                                    ? 'border-2 border-accent-primary text-accent-primary'
                                    : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                    }`}
                            >
                                🔥 {t('popular')}
                            </button>
                            <button
                                onClick={() => handleSortChange('liked')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'liked'
                                    ? 'border-2 border-accent-primary text-accent-primary'
                                    : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                    }`}
                            >
                                ❤️ {t('mostLiked')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Videos Grid */}
            {sortedVideos.length === 0 ? (
                <div className="text-center py-20 bg-bg-secondary rounded-2xl">
                    <span className="text-6xl mb-4 block">📹</span>
                    <h3 className="text-xl font-bold mb-2">{t('noVideosTitle')}</h3>
                    <p className="text-text-secondary">{t('noVideosDefault')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                        {paginatedVideos.map((video) => (
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
                                aspectRatio="video"
                                orientation={video.orientation}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-12 mb-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium transition-all hover:border-accent-primary hover:text-accent-primary disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-current"
                            >
                                ← {tCommon('prev')}
                            </button>

                            {getPageNumbers().map((page, i) => (
                                page === '...' ? (
                                    <span key={`ellipsis-${i}`} className="px-2 text-text-secondary">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${currentPage === page
                                            ? 'bg-accent-primary text-black'
                                            : 'border border-white/10 hover:border-accent-primary hover:text-accent-primary'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium transition-all hover:border-accent-primary hover:text-accent-primary disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-current"
                            >
                                {tCommon('next')} →
                            </button>
                        </div>
                    )}

                    {/* Page Info */}
                    <p className="text-center text-text-secondary text-sm">
                        {tCommon('showingVideos', { start: ((currentPage - 1) * VIDEOS_PER_PAGE) + 1, end: Math.min(currentPage * VIDEOS_PER_PAGE, sortedVideos.length), total: sortedVideos.length })}
                    </p>
                </>
            )}
        </>
    )
}
