'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useStreamers } from '@/contexts/StreamerContext'

export default function MyPage() {
    const { user } = useAuth()
    const { videos, streamers } = useStreamers()
    const [likedVideos, setLikedVideos] = useState<any[]>([])
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
    const [followedStreamers, setFollowedStreamers] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'following'>('liked')

    useEffect(() => {
        if (!user) return

        // Load liked videos
        const savedLikes = localStorage.getItem('kstreamer_liked_videos')
        if (savedLikes) {
            const likedIds = JSON.parse(savedLikes)
            setLikedVideos(videos.filter(v => likedIds.includes(v.id)))
        }

        // Load purchase history
        const savedHistory = localStorage.getItem('kstreamer_purchase_history')
        if (savedHistory) {
            setPurchaseHistory(JSON.parse(savedHistory))
        } else if (user.membership === 'vip') {
            // Mock history if they are VIP but history is empty (legacy test data)
            const mockHistory = [{
                id: 'PAYID-MOCK123',
                amount: '19.99',
                date: new Date().toISOString(),
                status: 'COMPLETED',
                plan: 'VIP Membership'
            }]
            setPurchaseHistory(mockHistory)
            localStorage.setItem('kstreamer_purchase_history', JSON.stringify(mockHistory))
        }

        // Load followed streamers
        const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
        if (savedFollows) {
            const followedIds = JSON.parse(savedFollows)
            setFollowedStreamers(streamers.filter(s => followedIds.includes(s.id)))
        }

    }, [user, videos, streamers])


    if (!user) {
        return (
            <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-center p-6">
                <Header />
                <h1 className="text-3xl font-bold mb-4">로그인이 필요합니다</h1>
                <p className="text-text-secondary mb-8">마이페이지는 회원 전용 공간입니다.</p>
                <Link href="/login" className="gradient-button text-black px-8 py-3 rounded-full font-semibold">
                    로그인 하러가기
                </Link>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <div className="h-[72px]" />

            <main className="max-w-[1200px] mx-auto px-6 py-12">
                {/* Profile Header */}
                <div className="bg-bg-secondary border border-white/5 rounded-2xl p-8 mb-10 flex flex-col md:flex-row items-center gap-8 shadow-xl">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-primary to-blue-500 flex items-center justify-center text-black text-4xl font-bold">
                        {user.name?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                            <h1 className="text-3xl font-bold">{user.name}</h1>
                            <span className="inline-block px-3 py-1 bg-accent-primary text-black text-xs font-bold rounded-full uppercase">
                                {user.membership}
                            </span>
                        </div>
                        <p className="text-text-secondary mb-4">{user.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm">
                                <span className="text-text-tertiary block text-[10px] uppercase mb-1">찜한 영상</span>
                                <span className="font-bold">{likedVideos.length}개</span>
                            </div>
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm">
                                <span className="text-text-tertiary block text-[10px] uppercase mb-1">팔로잉</span>
                                <span className="font-bold">{followedStreamers.length}명</span>
                            </div>
                            <div className="px-4 py-2 bg-white/5 rounded-lg text-sm">
                                <span className="text-text-tertiary block text-[10px] uppercase mb-1">결제 횟수</span>
                                <span className="font-bold">{purchaseHistory.length}회</span>
                            </div>
                        </div>
                    </div>
                    {user.membership === 'guest' && (
                        <Link
                            href="/membership"
                            className="w-full md:w-auto px-8 py-3 bg-accent-primary text-black font-bold rounded-full hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all text-center"
                        >
                            VIP 업그레이드
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('liked')}
                        className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'liked' ? 'text-accent-primary' : 'text-text-secondary'}`}
                    >
                        ❤️ 찜한 영상
                        {activeTab === 'liked' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'following' ? 'text-accent-primary' : 'text-text-secondary'}`}
                    >
                        👀 팔로잉
                        {activeTab === 'following' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'history' ? 'text-accent-primary' : 'text-text-secondary'}`}
                    >
                        💳 결제 내역
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'liked' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {likedVideos.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-bg-secondary rounded-2xl border border-dashed border-white/10">
                                <p className="text-text-secondary italic font-medium">찜한 영상이 없습니다.</p>
                                <Link href="/" className="mt-4 inline-block text-accent-primary hover:underline">영상 둘러보기</Link>
                            </div>
                        ) : (
                            likedVideos.map((video) => (
                                <Link key={video.id} href={`/video/${video.id}`} className="group bg-bg-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent-primary/50 transition-all">
                                    <div className={`aspect-video relative bg-gradient-to-br ${video.gradient}`}>
                                        {video.isVip && (
                                            <span className="absolute top-2 left-2 bg-accent-primary text-black px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                ⭐ VIP
                                            </span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white">▶ 재생하기</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold line-clamp-1 group-hover:text-accent-primary transition-colors">{video.title}</h3>
                                        <p className="text-text-secondary text-sm mt-1">@{video.streamerName}</p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'following' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {followedStreamers.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-bg-secondary rounded-2xl border border-dashed border-white/10">
                                <p className="text-text-secondary italic font-medium">팔로잉 중인 스트리머가 없습니다.</p>
                                <Link href="/" className="mt-4 inline-block text-accent-primary hover:underline">스트리머 찾아보기</Link>
                            </div>
                        ) : (
                            followedStreamers.map((streamer) => (
                                <Link key={streamer.id} href={`/streamer/${streamer.id}`} className="group block text-center">
                                    <div className={`w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br ${streamer.gradient} transition-transform group-hover:scale-110 shadow-lg ring-2 ring-transparent group-hover:ring-accent-primary`}></div>
                                    <p className="font-bold group-hover:text-accent-primary transition-colors">{streamer.name}</p>
                                    <p className="text-xs text-text-secondary">{streamer.videoCount} Videos</p>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-bg-secondary rounded-2xl border border-white/5 overflow-hidden">
                        {purchaseHistory.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-text-secondary italic">결제 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-text-tertiary text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">주문 번호</th>
                                        <th className="px-6 py-4 font-semibold">상품명</th>
                                        <th className="px-6 py-4 font-semibold">금액</th>
                                        <th className="px-6 py-4 font-semibold">날짜</th>
                                        <th className="px-6 py-4 font-semibold text-right">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {purchaseHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-text-secondary">{item.id}</td>
                                            <td className="px-6 py-4 font-medium">{item.plan || 'VIP Membership'}</td>
                                            <td className="px-6 py-4 font-bold text-accent-primary">${item.amount}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary">
                                                {new Date(item.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded uppercase">
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
