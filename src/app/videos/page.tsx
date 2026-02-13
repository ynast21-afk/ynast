'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'
import { useStreamers } from '@/contexts/StreamerContext'
import { useState, useMemo } from 'react'

const VIDEOS_PER_PAGE = 24

export default function VideosPage() {
    const { videos } = useStreamers()
    const [filter, setFilter] = useState<'all' | 'vip' | 'free'>('all')
    const [sort, setSort] = useState<'latest' | 'popular' | 'liked'>('latest')
    const [currentPage, setCurrentPage] = useState(1)

    // Filter videos
    const filteredVideos = videos.filter(video => {
        if (filter === 'vip') return video.isVip
        if (filter === 'free') return !video.isVip
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
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 Home</Link>
                        <span>›</span>
                        <span className="text-white">Videos</span>
                    </nav>

                    {/* Title & Filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-white">All Videos</h1>
                            <p className="text-text-secondary text-sm">{filteredVideos.length} videos available</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Filter Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFilterChange('all')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all'
                                        ? 'bg-accent-primary text-black'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => handleFilterChange('vip')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'vip'
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    🏆 VIP Only
                                </button>
                                <button
                                    onClick={() => handleFilterChange('free')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'free'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    Free
                                </button>
                            </div>

                            {/* Sort Buttons */}
                            <div className="flex gap-2">
                                <span className="text-text-secondary text-sm px-2">Sort:</span>
                                <button
                                    onClick={() => handleSortChange('latest')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'latest'
                                        ? 'border-2 border-accent-primary text-accent-primary'
                                        : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                        }`}
                                >
                                    ⏰ Latest
                                </button>
                                <button
                                    onClick={() => handleSortChange('popular')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'popular'
                                        ? 'border-2 border-accent-primary text-accent-primary'
                                        : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                        }`}
                                >
                                    🔥 Popular
                                </button>
                                <button
                                    onClick={() => handleSortChange('liked')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'liked'
                                        ? 'border-2 border-accent-primary text-accent-primary'
                                        : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                        }`}
                                >
                                    ❤️ Most Liked
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Videos Grid */}
                    {sortedVideos.length === 0 ? (
                        <div className="text-center py-20 bg-bg-secondary rounded-2xl">
                            <span className="text-6xl mb-4 block">📹</span>
                            <h3 className="text-xl font-bold mb-2">No Videos Yet</h3>
                            <p className="text-text-secondary">Check back later for new content!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                                {paginatedVideos.map((video) => (
                                    <VideoCard
                                        key={video.id}
                                        id={video.id}
                                        title={video.title}
                                        creator={video.streamerName}
                                        views={video.views}
                                        duration={video.duration}
                                        isVip={video.isVip}
                                        gradient={video.gradient}
                                        videoUrl={video.videoUrl}
                                        thumbnailUrl={video.thumbnailUrl}
                                        uploadedAt={video.uploadedAt}
                                        createdAt={video.createdAt}
                                        previewUrls={video.previewUrls}
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
                                        ← Prev
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
                                        Next →
                                    </button>
                                </div>
                            )}

                            {/* Page Info */}
                            <p className="text-center text-text-secondary text-sm">
                                Showing {((currentPage - 1) * VIDEOS_PER_PAGE) + 1}-{Math.min(currentPage * VIDEOS_PER_PAGE, sortedVideos.length)} of {sortedVideos.length} videos
                            </p>
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
