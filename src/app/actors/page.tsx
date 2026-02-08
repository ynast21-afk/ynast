'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useStreamers } from '@/contexts/StreamerContext'

export default function ActorsPage() {
    const { streamers } = useStreamers()

    // 비디오 수 기준 정렬 (인기순)
    const sortedStreamers = [...streamers].sort((a, b) => b.videoCount - a.videoCount)

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
                            <button className="px-4 py-2 bg-accent-primary text-black rounded-full text-sm font-medium">
                                🔥 Most Popular
                            </button>
                            <button className="px-4 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                                📝 Name A-Z
                            </button>
                            <button className="px-4 py-2 bg-bg-secondary rounded-full text-sm hover:bg-bg-tertiary transition-colors">
                                ⏰ Newest
                            </button>
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
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {streamer.profileImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={streamer.profileImage}
                                                alt={streamer.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <span className="text-6xl opacity-50">👤</span>
                                        )}
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
