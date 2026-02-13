'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useStreamers } from '@/contexts/StreamerContext'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { formatDate } from '@/utils/date'

// Need to wrap in Suspense or handle client-side because of useSearchParams in Next.js
function MyPageContent() {
    const { user } = useAuth()
    const { videos, streamers } = useStreamers()
    const searchParams = useSearchParams()

    const [likedVideos, setLikedVideos] = useState<any[]>([])
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
    const [followedStreamers, setFollowedStreamers] = useState<any[]>([])
    const [watchHistory, setWatchHistory] = useState<any[]>([])
    const [downloads, setDownloads] = useState<any[]>([])

    const [activeTab, setActiveTab] = useState<'liked' | 'purchases' | 'following' | 'history' | 'downloads'>('liked')
    const [isCancelling, setIsCancelling] = useState(false)

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'history') setActiveTab('history')
        else if (tab === 'downloads') setActiveTab('downloads')
        else if (tab === 'purchases') setActiveTab('purchases')
        else if (tab === 'following') setActiveTab('following')
        else setActiveTab('liked')
    }, [searchParams])

    useEffect(() => {
        if (!user) return

        const loadData = () => {
            // Load liked videos
            const savedLikes = localStorage.getItem('kstreamer_user_likes') || localStorage.getItem('kstreamer_liked_videos')
            if (savedLikes) {
                const likedIds = JSON.parse(savedLikes)
                setLikedVideos(videos.filter(v => likedIds.includes(v.id)))
            } else {
                setLikedVideos([])
            }

            // Load purchase history
            const savedHistory = localStorage.getItem('kstreamer_purchase_history')
            if (savedHistory) {
                setPurchaseHistory(JSON.parse(savedHistory))
            }

            // Load followed streamers
            const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
            if (savedFollows) {
                const followedIds = JSON.parse(savedFollows)
                setFollowedStreamers(streamers.filter(s => followedIds.includes(s.id)))
            } else {
                setFollowedStreamers([])
            }

            // Load watch history
            const savedWatchHistory = localStorage.getItem('kstreamer_watch_history')
            if (savedWatchHistory) {
                try {
                    const historyEntries: { videoId: string; watchedAt: string; progress: number }[] = JSON.parse(savedWatchHistory)
                    const historyVideos = historyEntries
                        .map(entry => {
                            const video = videos.find(v => v.id === entry.videoId)
                            if (video) return { ...video, watchedAt: entry.watchedAt, watchProgress: entry.progress }
                            return null
                        })
                        .filter(Boolean)
                    setWatchHistory(historyVideos)
                } catch { setWatchHistory([]) }
            } else {
                setWatchHistory([])
            }

            // Load download history
            const savedDownloads = localStorage.getItem('kstreamer_download_history')
            if (savedDownloads) {
                try {
                    const downloadEntries: { videoId: string; downloadedAt: string }[] = JSON.parse(savedDownloads)
                    const downloadVideos = downloadEntries
                        .map(entry => {
                            const video = videos.find(v => v.id === entry.videoId)
                            if (video) return { ...video, downloadedAt: entry.downloadedAt }
                            return null
                        })
                        .filter(Boolean)
                    setDownloads(downloadVideos)
                } catch { setDownloads([]) }
            } else {
                setDownloads([])
            }
        }

        // Helper to generate token
        function getToken(user: any) {
            try {
                return btoa(unescape(encodeURIComponent(JSON.stringify(user))))
            } catch (e) {
                return ''
            }
        }

        loadData()

        // Sync from Server (B2)
        if (user) {
            const token = getToken(user)
            if (token) {
                fetch('/api/user/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (!data) return

                        if (data.watchHistory && Array.isArray(data.watchHistory)) {
                            const historyVideos = data.watchHistory
                                .map((entry: any) => {
                                    const video = videos.find(v => v.id === entry.videoId)
                                    // @ts-ignore
                                    if (video) return { ...video, watchedAt: entry.watchedAt, watchProgress: entry.progress }
                                    return null
                                })
                                .filter(Boolean)
                            if (historyVideos.length > 0) setWatchHistory(historyVideos)
                        }

                        if (data.downloadHistory && Array.isArray(data.downloadHistory)) {
                            const downloadVideos = data.downloadHistory
                                .map((entry: any) => {
                                    const video = videos.find(v => v.id === entry.videoId)
                                    // @ts-ignore
                                    if (video) return { ...video, downloadedAt: entry.downloadedAt }
                                    return null
                                })
                                .filter(Boolean)
                            if (downloadVideos.length > 0) setDownloads(downloadVideos)
                        }
                    })
                    .catch(err => console.error('Failed to sync history:', err))
            }
        }

        // Listen for storage changes from other tabs/components
        window.addEventListener('storage', loadData)
        window.addEventListener('kstreamer_wishlist_updated', loadData)
        return () => {
            window.removeEventListener('storage', loadData)
            window.removeEventListener('kstreamer_wishlist_updated', loadData)
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

                    {/* Subscription Status - Enhanced (v3.0: Auth Revamp) */}
                    {user.membership !== 'guest' && (
                        <div className="w-full md:w-auto flex flex-col gap-3">
                            <div className="bg-white/5 border border-accent-primary/20 rounded-xl p-4 text-center md:text-left">
                                <p className="text-xs text-text-tertiary uppercase font-bold mb-1">멤버십 상태</p>
                                <p className="text-accent-primary font-bold text-lg uppercase">
                                    {user.membership} 멤버십
                                </p>
                                {user.subscriptionEnd && (() => {
                                    const endDate = new Date(user.subscriptionEnd!)
                                    const now = new Date()
                                    const totalMs = endDate.getTime() - now.getTime()
                                    const remainingDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24))
                                    const remainingHours = Math.ceil(totalMs / (1000 * 60 * 60))
                                    const isExpiring = remainingDays <= 7
                                    const isExpiringSoon = remainingDays <= 3
                                    const isExpired = remainingDays <= 0
                                    // Approximate progress (assume 30-day cycle)
                                    const progressPercent = isExpired ? 0 : Math.min(100, Math.max(0, (remainingDays / 30) * 100))

                                    return (
                                        <div className="mt-3">
                                            {/* Visual Progress Bar */}
                                            <div className="w-full bg-white/10 rounded-full h-2 mb-3 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isExpired ? 'bg-red-500' :
                                                        isExpiringSoon ? 'bg-red-400' :
                                                            isExpiring ? 'bg-yellow-400' :
                                                                'bg-accent-primary'
                                                        }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>

                                            {/* D-Day Display */}
                                            <div className={`text-center p-3 rounded-lg ${isExpired ? 'bg-red-500/20 border border-red-500/30' :
                                                isExpiringSoon ? 'bg-red-500/10 border border-red-500/20' :
                                                    isExpiring ? 'bg-yellow-500/10 border border-yellow-500/20' :
                                                        'bg-white/5 border border-white/10'
                                                }`}>
                                                {isExpired ? (
                                                    <p className="text-red-400 font-bold text-lg">만료됨</p>
                                                ) : remainingDays <= 1 ? (
                                                    <>
                                                        <p className="text-text-secondary text-xs">남은 시간</p>
                                                        <p className={`text-2xl font-bold ${isExpiringSoon ? 'text-red-400' : 'text-yellow-400'}`}>
                                                            {remainingHours}시간
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-text-secondary text-xs">남은 기간</p>
                                                        <p className={`text-2xl font-bold ${isExpiringSoon ? 'text-red-400' :
                                                            isExpiring ? 'text-yellow-400' :
                                                                'text-accent-primary'
                                                            }`}>
                                                            D-{remainingDays}
                                                        </p>
                                                    </>
                                                )}
                                                <p className="text-[10px] text-text-tertiary mt-1">
                                                    만료일: {endDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>

                                            {isExpiring && !isExpired && (
                                                <p className={`text-xs mt-2 ${isExpiringSoon ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    ⚠️ 멤버십이 곧 만료됩니다. 갱신하려면 <Link href="/membership" className="underline">여기를 클릭</Link>하세요.
                                                </p>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm('정말로 자동 결제를 해지하시겠습니까? 해지 후에도 현재 결제 기간까지는 VIP 혜택이 유지됩니다.')) {
                                        setIsCancelling(true)
                                        try {
                                            // 1. localStorage에서 결제 내역을 찾아 subscriptionId 가져오기
                                            const savedHistory = localStorage.getItem('kstreamer_purchase_history')
                                            const history = savedHistory ? JSON.parse(savedHistory) : []

                                            // Find latest active VIP subscription (PayPal, Lemon Squeezy, or Paddle)
                                            // PayPal: Starts with 'I-'
                                            // Paddle: Starts with 'sub_'
                                            // Lemon Squeezy: Numeric ID
                                            const latestSub = history.find((h: any) =>
                                                h.plan?.includes('VIP') &&
                                                (h.id?.toString().startsWith('I-') || h.id?.toString().startsWith('sub_') || !isNaN(Number(h.id)))
                                            )

                                            // Also check user object for subscriptionProvider
                                            const subscriptionId = latestSub?.id || user.subscriptionId

                                            if (!subscriptionId) {
                                                alert('구독 정보를 찾을 수 없습니다. 결제 내역 탭을 확인하시거나 관리자에게 문의해 주세요.')
                                                return
                                            }

                                            // 2. Determine Provider & API Endpoint
                                            const isPayPal = subscriptionId.toString().startsWith('I-')
                                            const isPaddle = subscriptionId.toString().startsWith('sub_') || user.subscriptionProvider === 'paddle'
                                            const apiEndpoint = isPayPal
                                                ? '/api/paypal/cancel-subscription'
                                                : isPaddle
                                                    ? '/api/paddle/cancel'
                                                    : '/api/lemon/cancel-subscription'

                                            const res = await fetch(apiEndpoint, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ subscriptionId, reason: 'User cancelled from MyPage' })
                                            })

                                            if (res.ok) {
                                                alert('자동 결제가 성공적으로 해지되었습니다.')
                                                // UI 상태 업데이트 또는 필요시 새로고침
                                                window.location.reload()
                                            } else {
                                                const err = await res.json()
                                                alert(`해지 실패: ${err.error || '알 수 없는 오류'}`)
                                            }
                                        } catch (e) {
                                            alert('해지 요청 중 오류가 발생했습니다.')
                                        } finally {
                                            setIsCancelling(false)
                                        }
                                    }
                                }}
                                disabled={isCancelling}
                                className={`px-6 py-2 rounded-lg text-sm font-bold border border-white/10 hover:bg-red-500/10 hover:text-red-400 transition-all ${isCancelling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isCancelling ? '처리 중...' : '자동 결제 해지'}
                            </button>
                        </div>
                    )}

                    {/* Guest Upgrade Prompt */}
                    {user.membership === 'guest' && (
                        <div className="w-full md:w-auto">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-text-tertiary uppercase font-bold mb-1">멤버십 상태</p>
                                <p className="text-text-secondary font-bold text-lg">무료 회원</p>
                                <p className="text-xs text-text-tertiary mt-2 mb-3">
                                    프리미엄 콘텐츠를 즐기려면 멤버십을 업그레이드하세요
                                </p>
                                <Link
                                    href="/membership"
                                    className="inline-block px-6 py-2 bg-accent-primary text-black font-bold rounded-full text-sm hover:opacity-90 transition-all"
                                >
                                    멤버십 업그레이드 →
                                </Link>
                            </div>
                        </div>
                    )}

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
                        📺 시청 기록
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('downloads')}
                        className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'downloads' ? 'text-accent-primary' : 'text-text-secondary'}`}
                    >
                        📥 다운로드
                        {activeTab === 'downloads' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'purchases' ? 'text-accent-primary' : 'text-text-secondary'}`}
                    >
                        💳 결제 내역
                        {activeTab === 'purchases' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-full"></div>}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {watchHistory.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-bg-secondary rounded-2xl border border-dashed border-white/10">
                                <p className="text-text-secondary italic font-medium">시청 기록이 없습니다.</p>
                                <Link href="/" className="mt-4 inline-block text-accent-primary hover:underline">영상 둘러보기</Link>
                            </div>
                        ) : (
                            watchHistory.map((video: any) => (
                                <Link key={video.id} href={`/video/${video.id}`} className="group bg-bg-secondary rounded-xl overflow-hidden border border-white/5 hover:border-accent-primary/50 transition-all">
                                    <div className={`aspect-video relative bg-gradient-to-br ${video.gradient}`}>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white">▶ 다시보기</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 h-1 bg-accent-primary" style={{ width: `${Math.round((video.watchProgress || 0) * 100)}%` }}></div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold line-clamp-1 group-hover:text-accent-primary transition-colors">{video.title}</h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-text-secondary text-sm">{Math.round((video.watchProgress || 0) * 100)}% 시청함</p>
                                            {video.watchedAt && <p className="text-text-tertiary text-xs">{formatDate(video.watchedAt)}</p>}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'downloads' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {downloads.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-bg-secondary rounded-2xl border border-dashed border-white/10">
                                <p className="text-text-secondary italic font-medium">다운로드 기록이 없습니다.</p>
                                <Link href="/" className="mt-4 inline-block text-accent-primary hover:underline">영상 둘러보기</Link>
                            </div>
                        ) : (
                            downloads.map((video: any) => (
                                <div key={video.id} className="group bg-bg-secondary rounded-xl overflow-hidden border border-white/5 p-4 flex gap-4 items-center">
                                    <div className={`w-20 aspect-video rounded-lg flex-shrink-0 bg-gradient-to-br ${video.gradient}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm line-clamp-1">{video.title}</h3>
                                        <p className="text-text-tertiary text-xs">@{video.streamerName} • {video.duration}</p>
                                        {video.downloadedAt && <p className="text-text-tertiary text-[10px] mt-0.5">{formatDate(video.downloadedAt)}</p>}
                                    </div>
                                    <Link href={`/video/${video.id}`} className="p-2 bg-white/5 hover:bg-accent-primary hover:text-black rounded-lg transition-all">
                                        ▶️
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'purchases' && (
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
                                                {formatDate(item.date)}
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

export default function MyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center text-accent-primary">로딩 중...</div>}>
            <MyPageContent />
        </Suspense>
    )
}
