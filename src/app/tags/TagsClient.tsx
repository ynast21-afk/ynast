'use client'

import React, { useState, useMemo } from 'react'
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

    // Tag search state
    const [searchQuery, setSearchQuery] = useState('')

    // Filter tags based on search query
    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return sortedTags
        const query = searchQuery.trim().toLowerCase().replace(/^#/, '')
        return sortedTags.filter(([tag]) => tag.toLowerCase().includes(query))
    }, [sortedTags, searchQuery])

    return (
        <div className="min-h-screen bg-bg-primary text-white flex flex-col font-sans">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
                            Explore Tags
                        </h1>
                        <p className="text-text-secondary">
                            Discover videos by popular topics and categories. Total <span className="text-accent-primary font-bold">{sortedTags.length}</span> tags found.
                            {searchQuery.trim() && filteredTags.length !== sortedTags.length && (
                                <span className="ml-2">· <span className="text-accent-primary font-bold">{filteredTags.length}</span> results</span>
                            )}
                        </p>
                    </div>
                    <div className="relative w-full md:w-72 shrink-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="태그 검색..."
                            className="w-full px-4 py-2.5 pl-10 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-text-secondary/60 focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/30 transition-all duration-200"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {filteredTags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-bg-secondary rounded-2xl border border-white/5">
                        <span className="text-4xl mb-4">{searchQuery ? '🔍' : '🏷️'}</span>
                        <h3 className="text-xl font-semibold mb-2">{searchQuery ? '검색 결과 없음' : 'No Tags Found'}</h3>
                        <p className="text-text-secondary">
                            {searchQuery
                                ? `"${searchQuery}"에 해당하는 태그를 찾을 수 없습니다.`
                                : 'Upload videos with tags to see them here.'
                            }
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-4 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition-colors"
                            >
                                전체 태그 보기
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-bg-secondary rounded-2xl p-6 md:p-8 border border-white/5">
                        <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                            {filteredTags.map(([tag, count], index) => {
                                // Use original index for styling (based on overall popularity)
                                const originalIndex = sortedTags.findIndex(([t]) => t === tag)
                                const styleIndex = searchQuery ? index : originalIndex

                                // Dynamic styling based on popularity
                                const sizeClass = styleIndex < 5 ? 'text-lg md:text-xl px-5 py-2.5' :
                                    styleIndex < 15 ? 'text-base md:text-lg px-4 py-2' :
                                        'text-sm px-3 py-1.5'

                                const colorClass = styleIndex < 5 ? 'bg-accent-primary text-black font-bold shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90' :
                                    styleIndex < 15 ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-accent-primary/50 hover:text-accent-primary' :
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
                                        <span className={`text-[0.7em] opacity-70 ${styleIndex < 5 ? 'text-black' : ''}`}>
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
