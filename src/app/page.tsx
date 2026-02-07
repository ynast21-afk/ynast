'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useStreamers } from '@/contexts/StreamerContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useState, useMemo, useEffect } from 'react'

export default function HomePage() {
    const t = useTranslations('membership')
    const tCommon = useTranslations('common')
    const { videos: rawVideos } = useStreamers()
    const { incrementVisit } = useSiteSettings()
    const [sortBy, setSortBy] = useState<'popular' | 'newest'>('newest')

    useEffect(() => {
        incrementVisit()
    }, [])

    const sortedVideos = useMemo(() => {
        const v = [...rawVideos]
        if (sortBy === 'newest') {
            return v.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime()
                const dateB = new Date(b.createdAt || 0).getTime()
                return dateB - dateA
            })
        }
        // Numeric popularity sort
        return v.sort((a, b) => (b.views || 0) - (a.views || 0))
    }, [rawVideos, sortBy])

    return (
        <div className="min-h-screen">
            <Header />

            {/* DEBUG MARKER V1.3.1 */}
            <div className="fixed top-32 right-10 z-[9999] flex flex-col gap-2">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-2xl animate-pulse">
                    v1.6.8 (HOTFIX APPLIED)
                </div>
                <div className="bg-black/90 text-green-400 p-3 rounded-lg border border-green-500/50 shadow-xl text-xs font-mono">
                    <div className="font-bold border-b border-green-500/30 mb-1 pb-1">DATA STATUS</div>
                    <div>Videos: {sortedVideos.length} (Raw: {rawVideos.length})</div>
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-[120px]" />

            {/* Hero Section */}
            <section className="px-6 lg:px-10 py-20 flex flex-col items-center justify-center text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-5xl lg:text-7xl font-extrabold mb-8 tracking-tighter leading-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        {t('title')}
                    </h1>
                    <p className="text-xl lg:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto font-light">
                        {t('subtitle')}
                    </p>

                    {/* Stats centered */}
                    <div className="flex flex-wrap justify-center gap-16 mb-16">
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">75K+</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">Videos</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">400+</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">Creators</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-5xl font-bold text-accent-primary group-hover:scale-110 transition-transform duration-300">∞</div>
                            <div className="text-sm text-text-secondary mt-2 uppercase tracking-widest font-semibold opacity-60">VIP Access</div>
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
