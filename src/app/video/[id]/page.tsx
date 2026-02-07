'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useStreamers } from '@/contexts/StreamerContext'
import { useAuth } from '@/contexts/AuthContext'

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
    const { id } = params
    const { videos, getStreamerById } = useStreamers()
    const { user } = useAuth()
    const [isLiked, setIsLiked] = useState(false)

    // Find the current video
    const video = videos.find(v => v.id === id)
    const streamer = video ? getStreamerById(video.streamerId) : null

    // If video not found
    if (!video) {
        return (
            <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-center p-6">
                <Header />
                <h1 className="text-3xl font-bold mb-4">영상를 찾을 수 없습니다</h1>
                <p className="text-text-secondary mb-8">요청하신 영상이 존재하지 않거나 삭제되었을 수 있습니다.</p>
                <Link href="/videos" className="gradient-button text-black px-8 py-3 rounded-full font-semibold">
                    다른 영상 보러가기
                </Link>
                <Footer />
            </div>
        )
    }

    const isLocked = video.isVip && (!user || user.membership === 'guest')

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
                        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
                            <div className={`aspect-video relative flex items-center justify-center group ${!video.videoUrl ? `bg-gradient-to-br ${video.gradient}` : 'bg-black'}`}>
                                {isLocked ? (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                                        <div className="w-20 h-20 rounded-full bg-accent-primary/20 flex items-center justify-center mb-6 text-accent-primary text-4xl">
                                            🔒
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2">VIP 전용 콘텐츠</h3>
                                        <p className="text-text-secondary max-w-sm mb-6">
                                            이 영상은 VIP 회원만 시청할 수 있습니다. 지금 바로 프리미엄 멤버십으로 업그레이드하세요!
                                        </p>
                                        <Link href="/membership" className="gradient-button text-black px-8 py-3 rounded-full font-bold">
                                            VIP 멤버십 가입하기
                                        </Link>
                                    </div>
                                ) : video.videoUrl ? (
                                    <video
                                        controls
                                        autoPlay
                                        className="w-full h-full"
                                        src={video.videoUrl}
                                    />
                                ) : (
                                    <>
                                        {/* Placeholder for legacy/mock data without real videoUrl */}
                                        <div className="text-center">
                                            <p className="text-text-secondary mb-4 italic">(비디오 파일이 업로드되지 않은 데모 영상입니다)</p>
                                            <div
                                                className="w-20 h-20 rounded-full bg-accent-primary/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                                style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)' }}
                                            >
                                                <span className="text-black text-3xl ml-1">▶</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {video.isVip && (
                                    <span className="absolute top-5 left-5 z-20 bg-accent-primary text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                        ⭐ VIP
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Video Info */}
                        <div className="py-5">
                            <h1 className="text-2xl font-semibold mb-3">{video.title}</h1>
                            <div className="flex flex-wrap gap-5 text-text-secondary text-sm mb-5">
                                <span>👁 {video.views} views</span>
                                <span>📅 {video.uploadedAt}</span>
                                <span>⏱ {video.duration}</span>
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
                                    ❤️ {isLiked ? (parseInt(video.likes) + 1) : video.likes}
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
                        <div className="flex items-center justify-between p-5 bg-bg-secondary border border-white/5 rounded-xl my-5">
                            <Link href={`/actors/${video.streamerId}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${video.gradient}`} />
                                <div>
                                    <div className="font-semibold text-lg">@{video.streamerName} {streamer?.koreanName && <span className="text-text-secondary text-sm">({streamer.koreanName})</span>}</div>
                                    <div className="text-sm text-text-secondary">{streamer?.videoCount || 0} Videos</div>
                                </div>
                            </Link>
                            <button className="px-7 py-3 bg-accent-primary text-black rounded-full font-semibold hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all">
                                Subscribe
                            </button>
                        </div>

                        {/* Description */}
                        <div className="bg-bg-secondary rounded-xl p-5 mb-8">
                            <h4 className="font-semibold mb-3">설명</h4>
                            <p className="text-text-secondary leading-relaxed">
                                {video.streamerName}의 새로운 댄스 비디오입니다. {video.duration} 동안 이어지는 환상적인 퍼포먼스를 시청하세요!
                                프리미엄 고화질로 제공되며, 실제 스트리머의 독점 콘텐츠를 감상하실 수 있습니다.
                            </p>
                        </div>

                        {/* Comments */}
                        <div>
                            <h3 className="text-xl font-semibold mb-5">💬 댓글 {comments.length}개</h3>

                            {/* Comment Input */}
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-bg-tertiary flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="댓글을 입력하세요..."
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
                        <h3 className="text-lg font-semibold mb-5">관련된 영상</h3>

                        <div className="space-y-4">
                            {videos.filter(v => v.id !== id).slice(0, 10).map((v) => (
                                <Link key={v.id} href={`/video/${v.id}`} className="flex gap-3 group">
                                    <div className={`w-40 h-[90px] bg-gradient-to-br ${v.gradient} rounded-lg flex-shrink-0 relative overflow-hidden`}>
                                        {v.isVip && (
                                            <span className="absolute top-1 left-1 bg-accent-primary text-black px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                VIP
                                            </span>
                                        )}
                                        <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[11px]">
                                            {v.duration}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-accent-primary transition-colors">
                                            {v.title}
                                        </h4>
                                        <p className="text-xs text-text-secondary">@{v.streamerName}</p>
                                        <p className="text-xs text-text-secondary">{v.views} views</p>
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
