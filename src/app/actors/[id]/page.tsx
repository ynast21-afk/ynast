'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useStreamers } from '@/contexts/StreamerContext'
import { useParams } from 'next/navigation'

export default function ActorDetailPage() {
    const { id } = useParams()
    const { getStreamerById, getStreamerVideos } = useStreamers()

    const streamer = getStreamerById(id as string)
    const videos = getStreamerVideos(id as string)

    if (!streamer) {
        return (
            <div className="min-h-screen bg-bg-primary">
                <Header />
                <div className="h-[120px]" />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <span className="text-6xl mb-4 block">❓</span>
                        <h1 className="text-2xl font-bold mb-2">Actor Not Found</h1>
                        <p className="text-text-secondary mb-6">The actor you're looking for doesn't exist.</p>
                        <Link href="/actors" className="text-accent-primary hover:underline">
                            ← Back to Actors
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

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
                        <Link href="/actors" className="hover:text-accent-primary">Actors</Link>
                        <span>›</span>
                        <span className="text-white">{streamer.name}</span>
                    </nav>

                    {/* Streamer Profile Header */}
                    <div className="flex items-center gap-6 mb-8 p-6 bg-bg-secondary rounded-2xl border border-white/10">
                        {/* Profile Image */}
                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${streamer.gradient} flex items-center justify-center`}>
                            <span className="text-4xl">👤</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-1">{streamer.name}</h1>
                            {streamer.koreanName && (
                                <p className="text-text-secondary text-lg mb-2">{streamer.koreanName}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-accent-primary font-medium">
                                    🎬 {streamer.videoCount} videos
                                </span>
                                <span className="text-text-secondary">
                                    Joined {streamer.createdAt}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Videos Section */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">Videos by {streamer.name}</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-text-secondary text-sm">Sort:</span>
                            <button className="px-4 py-2 border border-accent-primary text-accent-primary rounded-full text-sm font-medium">
                                Latest
                            </button>
                            <button className="px-4 py-2 border border-text-secondary text-text-secondary rounded-full text-sm hover:border-white hover:text-white transition-colors">
                                Popular
                            </button>
                        </div>
                    </div>

                    {videos.length === 0 ? (
                        <div className="text-center py-20 bg-bg-secondary rounded-2xl">
                            <span className="text-6xl mb-4 block">📹</span>
                            <h3 className="text-xl font-bold mb-2">No Videos Yet</h3>
                            <p className="text-text-secondary">This actor hasn't uploaded any videos yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {videos.map((video) => (
                                <div key={video.id} className="group">
                                    <div className={`relative aspect-[4/5] rounded-xl overflow-hidden bg-gradient-to-br ${video.gradient} cursor-pointer card-hover`}>
                                        {/* VIP Badge */}
                                        {video.isVip && (
                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded">
                                                VIP
                                            </div>
                                        )}

                                        {/* Duration */}
                                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                            {video.duration}
                                        </div>

                                        {/* Uploaded Time */}
                                        <div className="absolute bottom-12 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                                            {video.uploadedAt}
                                        </div>

                                        {/* Bottom Stats */}
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
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
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center">
                                                <span className="text-black text-2xl ml-1">▶</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Info */}
                                    <div className="mt-2">
                                        <h3 className="text-sm text-white line-clamp-2 group-hover:text-accent-primary transition-colors">
                                            {video.title}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
