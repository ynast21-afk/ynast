'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState } from 'react'
import { getMediaUrl } from '@/utils/b2url'
import { Streamer } from '@/data/initialData'
import { useStreamers } from '@/contexts/StreamerContext'

type SortOption = 'popular' | 'name' | 'newest'

interface ActorsClientProps {
    streamers: Streamer[]
    downloadToken: string | null
    downloadUrl: string | null
    activeBucketName: string | null
}

export default function ActorsClient({ streamers, downloadToken: serverToken, downloadUrl: serverDownloadUrl, activeBucketName: serverBucketName }: ActorsClientProps) {
    const { downloadToken: clientToken, downloadUrl: clientDownloadUrl, activeBucketName: clientBucketName } = useStreamers()
    const downloadToken = serverToken || clientToken
    const downloadUrl = serverDownloadUrl || clientDownloadUrl
    const activeBucketName = serverBucketName || clientBucketName
    const [sortBy, setSortBy] = useState<SortOption>('popular')

    const sortedStreamers = [...streamers].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '')
            case 'newest':
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            case 'popular':
            default:
                return b.videoCount - a.videoCount
        }
    })

    const sortButtons: { key: SortOption; icon: string; label: string }[] = [
        { key: 'popular', icon: '🔥', label: 'Most Popular' },
        { key: 'name', icon: '📝', label: 'Name A-Z' },
        { key: 'newest', icon: '⏰', label: 'Newest' },
    ]

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 Home</Link>
                        <span>›</span>
                        <span className="text-white">Actors</span>
                    </nav>

                    {/* Title */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-2xl">
                                👥
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Actors</h1>
                                <p className="text-text-secondary text-sm">{streamers.length} actors</p>
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary text-sm">Sort by:</span>
                            {sortButtons.map(({ key, icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setSortBy(key)}
                                    className={`px-4 py-2 rounded-full text-sm transition-colors ${sortBy === key
                                        ? 'bg-accent-primary text-black font-medium'
                                        : 'bg-bg-secondary hover:bg-bg-tertiary'
                                        }`}
                                >
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actors Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                        {sortedStreamers.map((streamer) => (
                            <Link
                                key={streamer.id}
                                href={`/actors/${streamer.id}`}
                                className="group"
                            >
                                <div className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br ${streamer.gradient} cursor-pointer card-hover`}>
                                    {/* Video Count Badge */}
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-accent-primary text-black text-xs font-bold rounded-full flex items-center gap-1">
                                        🎬 {streamer.videoCount}
                                    </div>

                                    {/* Profile Image */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                                        {streamer.profileImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={getMediaUrl({
                                                    url: streamer.profileImage,
                                                    token: downloadToken,
                                                    activeBucketName,
                                                    downloadUrl
                                                })}
                                                alt={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} - kStreamer dance creator profile`}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.parentElement?.classList.add('fallback-shown')
                                                }}
                                            />
                                        ) : null}
                                        <span className={`text-6xl opacity-50 absolute ${streamer.profileImage ? 'hidden fallback-icon' : ''}`}>👤</span>
                                        {/* Style hack to show icon if image fails */}
                                        <style jsx>{`
                                                .fallback-shown .fallback-icon {
                                                    display: block !important;
                                                }
                                            `}</style>
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                        <div className="text-center">
                                            <span className="text-white text-sm font-bold border border-white px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors">
                                                View Videos
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Streamer Info */}
                                <div className="mt-3">
                                    <h3 className="text-white font-medium group-hover:text-accent-primary transition-colors">
                                        {streamer.name}
                                    </h3>
                                    {streamer.koreanName && (
                                        <p className="text-text-secondary text-sm">
                                            {streamer.koreanName}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
