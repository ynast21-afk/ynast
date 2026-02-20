'use client'

import React from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VideoCard from '@/components/VideoCard'

interface Props {
    tag: string
    initialVideos: any[]
    initialStreamers: any[]
}

export default function TagDetailClient({ tag, initialVideos, initialStreamers }: Props) {
    return (
        <div className="min-h-screen bg-bg-primary text-white flex flex-col font-sans">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
                <div className="mb-8">
                    <Link href="/tags" className="inline-flex items-center text-text-secondary hover:text-white mb-4 transition-colors">
                        ← Back to Tags
                    </Link>
                    <div className="flex items-end gap-4">
                        <h1 className="text-3xl md:text-5xl font-bold text-accent-primary">
                            #{tag}
                        </h1>
                        <span className="text-xl text-text-secondary mb-1">
                            {initialVideos.length} videos
                        </span>
                    </div>
                </div>

                {initialVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-bg-secondary rounded-2xl border border-white/5">
                        <span className="text-4xl mb-4">🎬</span>
                        <h3 className="text-xl font-semibold mb-2">No videos found</h3>
                        <p className="text-text-secondary">Try searching for a different tag.</p>
                        <Link href="/tags" className="mt-4 px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            Browse all tags
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {initialVideos.map(video => {
                            const streamer = initialStreamers.find((s: any) => s.id === video.streamerId)
                            const streamerName = streamer ? (streamer.koreanName || streamer.name) : video.streamerName

                            return (
                                <VideoCard
                                    key={video.id}
                                    id={video.id}
                                    title={video.title}
                                    creator={streamerName || 'Unknown'}
                                    views={video.views}
                                    duration={video.duration}
                                    isVip={video.isVip}
                                    gradient={video.gradient}
                                    videoUrl={video.videoUrl}
                                    thumbnailUrl={video.thumbnailUrl}
                                    uploadedAt={video.uploadedAt}
                                    createdAt={video.createdAt}
                                    previewUrls={video.previewUrls}
                                    orientation={video.orientation}
                                />
                            )
                        })}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
