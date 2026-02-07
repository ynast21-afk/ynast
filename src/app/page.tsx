'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useStreamers } from '@/contexts/StreamerContext'
import { useState, useMemo } from 'react'

export default function HomePage() {
    const t = useTranslations('membership')
    const tCommon = useTranslations('common')
    const { videos: rawVideos } = useStreamers()
    const [sortBy, setSortBy] = useState<'popular' | 'newest'>('newest')

    const sortedVideos = useMemo(() => {
        const v = [...rawVideos]
        if (sortBy === 'newest') {
            // New videos have 'Just now' or are later in the array if ID is incremental
            // Real sorting would use createdAt.
            return v.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime()
                const dateB = new Date(b.createdAt || 0).getTime()
                return dateB - dateA
            })
        }
        // Basic popularity sort (mock)
        return v.sort((a, b) => {
            const viewsA = parseInt(a.views.replace(/[^0-9]/g, '')) || 0
            const viewsB = parseInt(b.views.replace(/[^0-9]/g, '')) || 0
            return viewsB - viewsA
        })
    }, [rawVideos, sortBy])

    return (
        <div className="min-h-screen">
            <Header />

            {/* DEBUG MARKER V1.2.1 */}
            <div className="fixed top-20 left-10 z-[9999] flex flex-col gap-2">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-2xl animate-pulse">
                    v1.2.4 (LOGS ACTIVE)
                </div>
                <div className="bg-black/90 text-green-400 p-3 rounded-lg border border-green-500/50 shadow-xl text-xs font-mono">
                    <div className="font-bold border-b border-green-500/30 mb-1 pb-1">DATA STATUS</div>
                    <div>Videos: {sortedVideos.length} (Raw: {rawVideos.length})</div>
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-[120px]" />

            {/* Hero Section */}
            <section className="px-6 lg:px-10 py-12">
                <div className="flex flex-col lg:flex-row gap-8 items-center max-w-7xl mx-auto">
                    {/* Featured Video */}
                    <div className="flex-[2] relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-950 dark:to-purple-950 border border-[var(--border-color)]">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl">🎬</span>
                        </div>
                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="w-20 h-20 rounded-full bg-accent-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)' }}
                            >
                                <span className="text-black text-3xl ml-1">▶</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Info */}
                    <div className="flex-1 p-4">
                        <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t('title')}</h1>
                        <p className="text-text-secondary mb-6">
                            {t('subtitle')}
                        </p>

                        {/* Stats */}
                        <div className="flex gap-8 mb-8">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">75K+</div>
                                <div className="text-sm text-text-secondary">Videos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">400+</div>
                                <div className="text-sm text-text-secondary">Creators</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-accent-primary">∞</div>
                                <div className="text-sm text-text-secondary">VIP Access</div>
                            </div>
                        </div>

                        <Link
                            href="/membership"
                            className="inline-block gradient-button text-black px-10 py-4 rounded-full font-bold text-lg animate-pulse-glow"
                        >
                            {t('getStarted')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="px-6 lg:px-10 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex gap-3">
                        <button className="px-5 py-2 bg-accent-primary text-black rounded-full text-sm font-medium">
                            {tCommon('videos')}
                        </button>
                        <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                            Trending
                        </button>
                        <button className="px-5 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                            New Releases
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
                    </div>
                </div>
            </section>

            {/* Video Grid */}
            <section className="px-6 lg:px-10 py-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 max-w-[1800px] mx-auto">
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
                        />
                    ))}
                </div>
            </section>

            {/* Load More */}
            <section className="text-center py-10">
                <button className="px-8 py-3 border border-accent-primary text-accent-primary rounded-full hover:bg-accent-primary hover:text-black transition-colors font-medium">
                    Load More Videos
                </button>
            </section>

            <Footer />
        </div>
    )
}
