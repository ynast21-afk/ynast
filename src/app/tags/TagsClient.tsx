'use client'

import React from 'react'
import Link from 'next/link'
import { useStreamers } from '@/contexts/StreamerContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface TagItem {
    tag: string
    count: number
}

interface TagsClientProps {
    initialTags: TagItem[]
}

export default function TagsClient({ initialTags }: TagsClientProps) {
    const { videos } = useStreamers()

    // Merge server tags with client-side context data (client may have fresher data)
    const tagCounts: Record<string, number> = {}

    // Start with server-provided tags
    initialTags.forEach(({ tag, count }) => {
        tagCounts[tag] = count
    })

    // Override with client-side context if it has data
    if (videos && videos.length > 0) {
        // Clear and rebuild from client data
        Object.keys(tagCounts).forEach(key => delete tagCounts[key])
        videos.forEach(video => {
            if (video.tags && Array.isArray(video.tags)) {
                video.tags.forEach(tag => {
                    const normalizedTag = tag.trim().replace(/^#/, '')
                    if (normalizedTag) {
                        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1
                    }
                })
            }
        })
    }

    // Sort by count (descending)
    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)

    return (
        <div className="min-h-screen bg-bg-primary text-white flex flex-col font-sans">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
                            Explore Tags
                        </h1>
                        <p className="text-text-secondary">
                            Discover videos by popular topics and categories. Total <span className="text-accent-primary font-bold">{sortedTags.length}</span> tags found.
                        </p>
                    </div>
                </div>

                {sortedTags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-bg-secondary rounded-2xl border border-white/5">
                        <span className="text-4xl mb-4">🏷️</span>
                        <h3 className="text-xl font-semibold mb-2">No Tags Found</h3>
                        <p className="text-text-secondary">Upload videos with tags to see them here.</p>
                    </div>
                ) : (
                    <div className="bg-bg-secondary rounded-2xl p-6 md:p-8 border border-white/5">
                        <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                            {sortedTags.map(([tag, count], index) => {
                                // Dynamic styling based on popularity
                                const sizeClass = index < 5 ? 'text-lg md:text-xl px-5 py-2.5' :
                                    index < 15 ? 'text-base md:text-lg px-4 py-2' :
                                        'text-sm px-3 py-1.5'

                                const colorClass = index < 5 ? 'bg-accent-primary text-black font-bold shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90' :
                                    index < 15 ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-accent-primary/50 hover:text-accent-primary' :
                                        'bg-black/40 text-text-secondary border border-white/5 hover:bg-white/10 hover:text-white'

                                return (
                                    <Link
                                        key={tag}
                                        href={`/tags/${encodeURIComponent(tag)}`}
                                        className={`
                                            rounded-full transition-all duration-300 flex items-center gap-2 transform hover:scale-105 active:scale-95
                                            ${sizeClass} ${colorClass}
                                        `}
                                    >
                                        <span>#{tag}</span>
                                        <span className={`text-[0.7em] opacity-70 ${index < 5 ? 'text-black' : ''}`}>
                                            {count}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
