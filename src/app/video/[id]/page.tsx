'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useStreamers } from '@/contexts/StreamerContext'
import { useAuth } from '@/contexts/AuthContext'
import CommentSection from '@/components/CommentSection'

export default function VideoPage({ params }: { params: { id: string } }) {
    const { id } = params
    const { videos, getStreamerById } = useStreamers()
    const { user } = useAuth()
    const [isLiked, setIsLiked] = useState(false)
    const [isFollowed, setIsFollowed] = useState(false)

    // Find the current video
    const video = videos.find(v => v.id === id)
    const streamer = video ? getStreamerById(video.streamerId) : null

    // Check like and follow status on mount
    useEffect(() => {
        if (!user || !id || !video) return

        // Check like status
        const savedLikes = localStorage.getItem('kstreamer_user_likes')
        if (savedLikes) {
            const likes: string[] = JSON.parse(savedLikes)
            setIsLiked(likes.includes(id))
        }

        // Check Following status
        const followed = JSON.parse(localStorage.getItem('kstreamer_followed_streamers') || '[]')
        setIsFollowed(followed.includes(video.streamerId))
    }, [user, id, video])

    // Toggle like
    const toggleLike = () => {
        if (!user) {
            alert('찜하기를 하려면 로그인이 필요합니다.')
            return
        }

        const savedLikes = localStorage.getItem('kstreamer_user_likes')
        const currentLikes: string[] = savedLikes ? JSON.parse(savedLikes) : []
        let updatedLikes: string[]

        if (isLiked) {
            updatedLikes = currentLikes.filter(likeId => likeId !== id)
        } else {
            updatedLikes = [id, ...currentLikes]

            // Notification simulation
            const notifications = JSON.parse(localStorage.getItem('kstreamer_admin_notifications') || '[]')
            notifications.unshift({
                id: Date.now().toString(),
                type: 'like',
                message: `${user.name}님이 '${video?.title}' 영상을 찜했습니다.`,
                time: new Date().toISOString(),
                isRead: false
            })
            localStorage.setItem('kstreamer_admin_notifications', JSON.stringify(notifications))
        }

        localStorage.setItem('kstreamer_user_likes', JSON.stringify(updatedLikes))
        setIsLiked(!isLiked)
    }

    const handleFollowToggle = () => {
        if (!user) {
            alert('팔로우하려면 로그인이 필요합니다.')
            return
        }
        if (!video) return // Should not happen if button is rendered

        const followed = JSON.parse(localStorage.getItem('kstreamer_followed_streamers') || '[]')
        let newFollowed: string[]

        if (isFollowed) {
            newFollowed = followed.filter((streamerId: string) => streamerId !== video.streamerId)
        } else {
            newFollowed = [...followed, video.streamerId]

            // Notify Admin
            const notifications = JSON.parse(localStorage.getItem('kstreamer_admin_notifications') || '[]')
            notifications.unshift({
                id: Date.now().toString(),
                type: 'follow', // Changed type to 'follow'
                message: `${user.name}님이 ${video.streamerName}님을 팔로우했습니다.`,
                time: new Date().toISOString(),
                isRead: false
            })
            localStorage.setItem('kstreamer_admin_notifications', JSON.stringify(notifications))
        }

        localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(newFollowed))
        setIsFollowed(!isFollowed)
    }

    // If video not found
    if (!video) {
        return (
            <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-center p-6">
                <Header />
                <h1 className="text-3xl font-bold mb-4">영상을 찾을 수 없습니다</h1>
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
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-semibold mb-3">{video.title}</h1>
                                    <div className="flex flex-wrap gap-5 text-text-secondary text-sm mb-5">
                                        <span>👁 {video.views} views</span>
                                        <span>📅 {video.uploadedAt}</span>
                                        <span>⏱ {video.duration}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleLike}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all font-bold ${isLiked
                                        ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                        : 'bg-bg-secondary border-white/10 hover:border-accent-primary hover:text-accent-primary'
                                        }`}
                                >
                                    {isLiked ? '❤️ 찜한 영상' : '🤍 찜하기'}
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    📥 Download
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href)
                                        alert('주소가 복사되었습니다!')
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all"
                                >
                                    ↗️ Share
                                </button>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all">
                                    ➕ Playlist
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
                            <button
                                onClick={handleFollowToggle}
                                className={`px-7 py-3 rounded-full font-semibold transition-all ${isFollowed
                                        ? 'bg-bg-primary border border-white/20 text-white hover:bg-white/5'
                                        : 'bg-accent-primary text-black hover:scale-105'
                                    }`}
                            >
                                {isFollowed ? 'Following' : 'Follow'}
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

                        {/* Comments System */}
                        <CommentSection videoId={id} />
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
