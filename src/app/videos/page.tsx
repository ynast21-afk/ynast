'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useStreamers } from '@/contexts/StreamerContext'
import { useState } from 'react'

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
            return parseInt(b.views.replace(/[^0-9]/g, '')) - parseInt(a.views.replace(/[^0-9]/g, ''))
        }
        if (sort === 'liked') {
            return parseInt(b.likes) - parseInt(a.likes)
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
                                <Link key={video.id} href={`/video/${video.id}`} className="group block">
                                    <div className={`relative aspect-[4/5] rounded-xl overflow-hidden bg-gradient-to-br ${video.gradient || 'from-purple-600 to-blue-600'} cursor-pointer card-hover shadow-lg`}>
                                        {/* VIP Badge */}
                                        {video.isVip && (
                                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded shadow-sm">
                                                VIP
                                            </div>
                                        )}

                                        {/* Duration */}
                                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                            {video.duration}
                                        </div>

                                        {/* Uploaded Time */}
                                        <div className="absolute bottom-12 right-2 z-10 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                            {video.uploadedAt}
                                        </div>

                                        {/* Bottom Stats */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                            <div className="flex items-center gap-3 text-white text-xs">
                                                <span className="flex items-center gap-1">
                                                    👁️ {video.views}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    ❤️ {video.likes}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Play overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                                                <span className="text-black text-2xl ml-1">▶</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Info */}
                                    <div className="mt-2">
                                        <h3 className="text-sm text-white font-medium line-clamp-2 group-hover:text-accent-primary transition-colors">
                                            {video.title}
                                        </h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-text-secondary hover:text-accent-primary transition-colors">
                                                @{video.streamerName}
                                            </span>
                                            <span className="text-[10px] text-text-tertiary">{video.uploadedAt}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
