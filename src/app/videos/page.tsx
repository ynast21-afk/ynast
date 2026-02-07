'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'
import { useStreamers } from '@/contexts/StreamerContext'
import { useState } from 'react'
import { getValidGradient } from '@/utils/ui'

export default function VideosPage() {
    const { videos } = useStreamers()
    const [filter, setFilter] = useState<'all' | 'vip' | 'free'>('all')
    const [sort, setSort] = useState<'latest' | 'popular' | 'liked'>('latest')

    // Filter videos
    const filteredVideos = videos.filter(video => {
        if (filter === 'vip') return video.isVip
        if (filter === 'free') return !video.isVip
        return true
    })

    // Sort videos
    const sortedVideos = [...filteredVideos].sort((a, b) => {
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

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <div className="h-[120px]" />

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
                            <p className="text-text-secondary text-sm">{videos.length} videos available</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Filter Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all'
                                        ? 'bg-accent-primary text-black'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('vip')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'vip'
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    🏆 VIP Only
                                </button>
                                <button
                                    onClick={() => setFilter('free')}
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
                                    onClick={() => setSort('latest')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'latest'
                                        ? 'border-2 border-accent-primary text-accent-primary'
                                        : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                        }`}
                                >
                                    ⏰ Latest
                                </button>
                                <button
                                    onClick={() => setSort('popular')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === 'popular'
                                        ? 'border-2 border-accent-primary text-accent-primary'
                                        : 'border border-text-secondary text-text-secondary hover:border-white hover:text-white'
                                        }`}
                                >
                                    🔥 Popular
                                </button>
                                <button
                                    onClick={() => setSort('liked')}
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {sortedVideos.map((video) => (
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
                                    uploadedAt={video.uploadedAt}
                                    aspectRatio="portrait"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
