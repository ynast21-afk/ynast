'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState } from 'react'

const relatedVideos = [
    { id: '2', title: 'Future Tech 2025: What to Expect', creator: 'TechInsider', views: '850K', duration: '12:04', isVip: false },
    { id: '3', title: 'Chill Synthwave Mix 2024 - Coding / Studying', creator: 'LofiGirl', views: '2.4M', duration: '1:04:20', isVip: true },
    { id: '4', title: 'Hacking the Mainframe: A Visual Guide', creator: 'CyberSec Daily', views: '120K', duration: '08:45', isVip: false },
    { id: '5', title: 'Hardware Teardown: The Quantum Chip', creator: 'HardwareUnboxed', views: '300K', duration: '15:30', isVip: true },
    { id: '6', title: 'Nightlife in Tokyo: Hidden Bars Guide', creator: 'TravelWithMe', views: '45K', duration: '22:15', isVip: false },
    { id: '7', title: 'Dance Reaction Compilation Vol. 5', creator: 'DanceQueen', views: '89K', duration: '18:30', isVip: true },
]

const comments = [
    { id: 1, author: 'TechEnthusiast', time: '2 hours ago', text: 'The lighting effects in this video are absolutely insane. The reflection on the wet pavement is next level. 🤯', likes: 342 },
    { id: 2, author: 'GameDev_Pro', time: '5 hours ago', text: 'Is this rendered in Unreal Engine 5? The detail is incredible. Makes me want to upgrade my GPU immediately.', likes: 128 },
    { id: 3, author: 'CyberpunkFan99', time: '1 day ago', text: 'Finally some high quality dark cyberpunk content! Subscribed. Please do a day version next!', likes: 89 },
]

export default function VideoPage({ params }: { params: { id: string } }) {
    const [isLiked, setIsLiked] = useState(false)

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            {/* Spacer for fixed header */}
            <div className="h-[72px]" />

            <div className="max-w-[1800px] mx-auto px-6 py-8">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
                    {/* Left Column - Video */}
                    <div>
                        {/* Video Player */}
                        <div className="bg-black rounded-2xl overflow-hidden">
                            <div className="aspect-video bg-gradient-to-br from-indigo-950 to-purple-950 relative flex items-center justify-center">
                                {/* VIP Badge */}
                                <span className="absolute top-5 right-5 bg-accent-primary text-black px-4 py-2 rounded-full font-bold text-sm">
                                    ⭐ VIP Only
                                </span>

                                {/* Play Button */}
                                <div
                                    className="w-20 h-20 rounded-full bg-accent-primary/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                    style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)' }}
                                >
                                    <span className="text-black text-3xl ml-1">▶</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-5 px-5 py-4 bg-bg-secondary">
                                <button className="text-lg hover:text-accent-primary">⏮</button>
                                <button className="text-lg hover:text-accent-primary">▶️</button>
                                <button className="text-lg hover:text-accent-primary">⏭</button>

                                <div className="flex-1 h-1 bg-bg-tertiary rounded-full cursor-pointer">
                                    <div className="w-[35%] h-full bg-accent-primary rounded-full" />
                                </div>

                                <span className="text-sm text-text-secondary">5:23 / 15:30</span>
                                <button className="text-lg hover:text-accent-primary">🔊</button>
                                <button className="text-lg hover:text-accent-primary">⚙️</button>
                                <button className="text-lg hover:text-accent-primary">⛶</button>
                            </div>
                        </div>

                        {/* Video Info */}
                        <div className="py-5">
                            <h1 className="text-2xl font-semibold mb-3">Cyberpunk City - Night Walk [8K]</h1>
                            <div className="flex flex-wrap gap-5 text-text-secondary text-sm mb-5">
                                <span>👁 125,432 views</span>
                                <span>📅 Feb 5, 2026</span>
                                <span>⏱ 15:30</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setIsLiked(!isLiked)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all ${isLiked
                                            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                            : 'bg-bg-secondary border-white/10 hover:border-accent-primary hover:text-accent-primary'
                                        }`}
                                >
                                    ❤️ 12.5K
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    📥 Download
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    ↗️ Share
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    ➕ Playlist
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    🚩 Report
                                </button>
                            </div>
                        </div>

                        {/* Creator Section */}
                        <div className="flex items-center justify-between p-5 bg-bg-secondary rounded-xl my-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary" />
                                <div>
                                    <div className="font-semibold text-lg">NeonWalker</div>
                                    <div className="text-sm text-text-secondary">500K Subscribers</div>
                                </div>
                            </div>
                            <button className="px-7 py-3 bg-accent-primary text-black rounded-full font-semibold hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all">
                                Subscribe
                            </button>
                        </div>

                        {/* Description */}
                        <div className="bg-bg-secondary rounded-xl p-5 mb-8">
                            <h4 className="font-semibold mb-3">Description</h4>
                            <p className="text-text-secondary leading-relaxed">
                                Take a virtual walk through the neon-soaked streets of Neo-Tokyo in the year 2077.
                                This 8K footage captures the immersive atmosphere of a cyberpunk future, featuring
                                stunning ray-traced reflections, volumetric fog, and vibrant holographic advertisements.
                                Best viewed on an OLED display.
                            </p>
                        </div>

                        {/* Comments */}
                        <div>
                            <h3 className="text-xl font-semibold mb-5">💬 2,408 Comments</h3>

                            {/* Comment Input */}
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-bg-tertiary flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-bg-secondary border border-white/10 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                                />
                            </div>

                            {/* Comment List */}
                            <div className="space-y-6">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-zinc-700 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium">@{comment.author}</span>
                                                <span className="text-xs text-text-secondary">{comment.time}</span>
                                            </div>
                                            <p className="text-text-secondary leading-relaxed mb-3">{comment.text}</p>
                                            <div className="flex gap-4 text-xs text-text-secondary">
                                                <span className="hover:text-accent-primary cursor-pointer">❤️ {comment.likes}</span>
                                                <span className="hover:text-accent-primary cursor-pointer">💬 Reply</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Related Videos */}
                    <aside>
                        <h3 className="text-lg font-semibold mb-5">Up Next</h3>

                        <div className="space-y-4">
                            {relatedVideos.map((video) => (
                                <Link key={video.id} href={`/video/${video.id}`} className="flex gap-3 group">
                                    <div className="w-40 h-[90px] bg-gradient-to-br from-slate-800 to-zinc-800 rounded-lg flex-shrink-0 relative overflow-hidden">
                                        {video.isVip && (
                                            <span className="absolute top-1 left-1 bg-accent-primary text-black px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                VIP
                                            </span>
                                        )}
                                        <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[11px]">
                                            {video.duration}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-accent-primary transition-colors">
                                            {video.title}
                                        </h4>
                                        <p className="text-xs text-text-secondary">{video.creator}</p>
                                        <p className="text-xs text-text-secondary">{video.views} views</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>

            <Footer />
        </div>
    )
}
