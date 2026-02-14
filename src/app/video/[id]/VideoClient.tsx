'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Video, Streamer } from '@/data/initialData'
import { useAuth } from '@/contexts/AuthContext'
import CommentSection from '@/components/CommentSection'
import RelatedVideoCard from '@/components/RelatedVideoCard'
import { formatDate } from '@/utils/date'

import { useStreamers } from '@/contexts/StreamerContext'
import { MembershipLevel } from '@/contexts/AuthContext'
import { hasAccess } from '@/utils/membership'
import { getMediaUrl } from '@/utils/b2url'

interface VideoClientProps {
    video?: Video // Optional because we might search for it
    streamer?: Streamer | undefined
    relatedVideos: Video[]
    fallbackId?: string
}

// Helper to generate token for API calls
function getToken(user: any) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(user))))
    } catch (e) {
        console.error('Token generation error:', e)
        return ''
    }
}

export default function VideoClient({ video: initialVideo, streamer: initialStreamer, relatedVideos, fallbackId }: VideoClientProps) {
    const { videos: allVideos, streamers, incrementVideoView, toggleVideoLike: toggleVideoLikeState, downloadToken, downloadUrl, activeBucketName } = useStreamers()
    const [video, setVideo] = useState<Video | undefined>(initialVideo)
    const [streamer, setStreamer] = useState<Streamer | undefined>(initialStreamer)
    const [videoPlayError, setVideoPlayError] = useState(false)

    const id = (video?.id || fallbackId) as string
    const { user } = useAuth()
    const [isLiked, setIsLiked] = useState(false)
    const [isFollowed, setIsFollowed] = useState(false)

    // Increment view once per session/id
    const lastViewedIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (id && lastViewedIdRef.current !== id) {
            incrementVideoView(id)
            lastViewedIdRef.current = id

            const now = new Date().toISOString()
            const historyItem = { videoId: id, watchedAt: now, progress: 0.5 }

            // Save to watch history (Local)
            try {
                const savedHistory = localStorage.getItem('kstreamer_watch_history')
                const history: { videoId: string; watchedAt: string; progress: number }[] = savedHistory ? JSON.parse(savedHistory) : []
                // Remove existing entry for this video if present
                const filtered = history.filter(entry => entry.videoId !== id)
                // Add new entry at the beginning
                filtered.unshift(historyItem)
                // Keep max 100 entries
                localStorage.setItem('kstreamer_watch_history', JSON.stringify(filtered.slice(0, 100)))
            } catch (e) {
                console.error('Failed to save watch history:', e)
            }

            // Sync with Server (B2)
            if (user) {
                fetch('/api/user/history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken(user)}`
                    },
                    body: JSON.stringify({
                        type: 'watch',
                        item: historyItem
                    })
                }).catch(err => console.error('Failed to sync watch history:', err))
            }
        }
    }, [id, incrementVideoView, user])



    // Reset video error state when video changes
    useEffect(() => {
        setVideoPlayError(false)
    }, [id])


    // Fallback logic for videos not found on server
    useEffect(() => {
        if (!video && fallbackId) {
            const foundVideo = allVideos.find(v => v.id === fallbackId)
            if (foundVideo) {
                setVideo(foundVideo)
                const foundStreamer = streamers.find(s => s.id === foundVideo.streamerId)
                setStreamer(foundStreamer)
            }
        } else if (id) {
            // Keep video object in sync with context (for real-time view/like updates)
            const updatedVideo = allVideos.find(v => v.id === id)
            if (updatedVideo) setVideo(updatedVideo)
        }
    }, [fallbackId, allVideos, video, streamers, id])

    const rawVideoUrl = getMediaUrl({
        url: video?.videoUrl,
        activeBucketName,
        downloadUrl
    })

    // Check like and follow status on mount
    useEffect(() => {
        if (!user || !id) return

        // 1. Check from localStorage cache first (instant)
        const savedLikes = localStorage.getItem('kstreamer_user_likes')
        if (savedLikes) {
            const likes: string[] = JSON.parse(savedLikes)
            setIsLiked(likes.includes(id))
        }

        if (video) {
            const followed = JSON.parse(localStorage.getItem('kstreamer_followed_streamers') || '[]')
            setIsFollowed(followed.includes(video.streamerId))
        }

        // 2. Load from B2 server (async, overwrite with server truth)
        const token = getToken(user)
        if (token) {
            fetch('/api/user/social', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        if (data.likes) {
                            setIsLiked(data.likes.includes(id))
                            localStorage.setItem('kstreamer_user_likes', JSON.stringify(data.likes))
                        }
                        if (data.follows && video) {
                            setIsFollowed(data.follows.includes(video.streamerId))
                            localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(data.follows))
                        }
                    }
                })
                .catch(err => console.error('Failed to load social data from server:', err))
        }
    }, [user, id, video])

    // Helper: send notification to both localStorage cache and B2
    const sendNotification = (notification: any) => {
        try {
            const notifications = JSON.parse(localStorage.getItem('kstreamer_admin_notifications') || '[]')
            notifications.unshift(notification)
            localStorage.setItem('kstreamer_admin_notifications', JSON.stringify(notifications))
        } catch { /* ignore */ }
        fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification })
        }).catch(err => console.error('Failed to sync notification:', err))
    }

    // Toggle like
    const toggleLike = () => {
        if (!user) {
            alert('찜하기를 하려면 로그인이 필요합니다.')
            return
        }

        const savedLikes = localStorage.getItem('kstreamer_user_likes')
        const currentLikes: string[] = savedLikes ? JSON.parse(savedLikes) : []
        let updatedLikes: string[] = []
        const newLikedState = !isLiked

        if (isLiked) {
            updatedLikes = currentLikes.filter(likeId => likeId !== id)
            toggleVideoLikeState(id, false)
        } else if (id) {
            updatedLikes = [id, ...currentLikes]
            toggleVideoLikeState(id, true)

            // Notification
            if (video) {
                sendNotification({
                    id: Date.now().toString(),
                    type: 'like',
                    message: `${user.name}님이 '${video.title}' 영상을 찜했습니다.`,
                    time: new Date().toISOString(),
                    isRead: false
                })
            }
        }

        // Save to localStorage cache
        localStorage.setItem('kstreamer_user_likes', JSON.stringify(updatedLikes))
        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new CustomEvent('kstreamer_wishlist_updated'))
        setIsLiked(newLikedState)

        // Sync to B2
        const token = getToken(user)
        if (token) {
            fetch('/api/user/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type: 'like', action: newLikedState ? 'add' : 'remove', targetId: id })
            }).catch(err => console.error('Failed to sync like:', err))
        }
    }

    const handleFollowToggle = () => {
        if (!user) {
            alert('팔로우하려면 로그인이 필요합니다.')
            return
        }

        const followed = JSON.parse(localStorage.getItem('kstreamer_followed_streamers') || '[]')
        let newFollowed: string[] = []
        const newFollowedState = !isFollowed

        if (isFollowed) {
            newFollowed = followed.filter((streamerId: string) => streamerId !== video?.streamerId)
        } else if (video) {
            newFollowed = [...followed, video.streamerId]

            // Notification
            sendNotification({
                id: Date.now().toString(),
                type: 'follow',
                message: `${user.name}님이 ${video.streamerName}님을 팔로우했습니다.`,
                time: new Date().toISOString(),
                isRead: false
            })
        }

        // Save to localStorage cache
        localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(newFollowed))
        setIsFollowed(newFollowedState)

        // Sync to B2
        const token = getToken(user)
        if (token && video) {
            fetch('/api/user/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type: 'follow', action: newFollowedState ? 'add' : 'remove', targetId: video.streamerId })
            }).catch(err => console.error('Failed to sync follow:', err))
        }
    }

    const isStreamingLocked = !hasAccess(video?.minStreamingLevel, user?.membership)
    const isDownloadLocked = !hasAccess(video?.minDownloadLevel, user?.membership)

    const handleDownload = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        if (isDownloadLocked) {
            alert(`${(video?.minDownloadLevel || 'vip').toUpperCase()} 회원 전용 다운로드 혜택입니다. 멤버십을 업그레이드 해주세요!`)
            return
        }

        if (!rawVideoUrl) {
            alert('이 영상은 다운로드할 수 없습니다.')
            return
        }

        const urlWithAuth = getMediaUrl({
            url: rawVideoUrl,
            token: downloadToken,
            activeBucketName,
            downloadUrl
        })

        const link = document.createElement('a')
        link.href = urlWithAuth
        link.download = `${video?.title || 'video'}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        const now = new Date().toISOString()
        const downloadItem = { videoId: id, downloadedAt: now }

        // Save to download history (Local)
        try {
            const savedDownloads = localStorage.getItem('kstreamer_download_history')
            const downloads: { videoId: string; downloadedAt: string }[] = savedDownloads ? JSON.parse(savedDownloads) : []
            const filtered = downloads.filter(entry => entry.videoId !== id)
            filtered.unshift(downloadItem)
            localStorage.setItem('kstreamer_download_history', JSON.stringify(filtered.slice(0, 100)))
        } catch (e) {
            console.error('Failed to save download history:', e)
        }

        // Sync with Server (B2)
        if (user) {
            fetch('/api/user/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken(user)}`
                },
                body: JSON.stringify({
                    type: 'download',
                    item: downloadItem
                })
            }).catch(err => console.error('Failed to sync download history:', err))
        }
    }

    if (!video) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    // 비디오 URL with auth
    const videoUrlWithAuth = getMediaUrl({
        url: video.videoUrl,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    })

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
                                {isStreamingLocked ? (
                                    <>
                                        {/* Static thumbnail background for locked videos */}
                                        {video.thumbnailUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={getMediaUrl({ url: video.thumbnailUrl, token: downloadToken, activeBucketName, downloadUrl })}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        )}

                                        {/* Dark overlay + lock UI */}
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px] p-6 text-center">
                                            <div className="w-20 h-20 rounded-full bg-accent-primary/20 flex items-center justify-center mb-6 text-accent-primary text-4xl">
                                                🔒
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2">{(video?.minStreamingLevel || 'vip').toUpperCase()} 전용 콘텐츠</h3>
                                            <p className="text-text-secondary max-w-sm mb-6">
                                                이 영상은 {(video?.minStreamingLevel || 'vip').toUpperCase()} 등급 이상의 회원만 시청할 수 있습니다. 지금 바로 멤버십을 업그레이드하세요!
                                            </p>
                                            <Link href="/membership" className="gradient-button text-black px-8 py-3 rounded-full font-bold">
                                                멤버십 가입하기
                                            </Link>
                                        </div>
                                    </>
                                ) : video.videoUrl && !videoPlayError ? (
                                    <video
                                        controls
                                        controlsList="nodownload noremoteplayback"
                                        disablePictureInPicture
                                        onContextMenu={(e) => {
                                            if (isDownloadLocked) {
                                                e.preventDefault()
                                                alert(`${(video?.minDownloadLevel || 'vip').toUpperCase()} 회원 전용 다운로드 혜택입니다.`)
                                                return false
                                            }
                                        }}
                                        onError={() => setVideoPlayError(true)}
                                        className="w-full h-full"
                                        poster={getMediaUrl({
                                            url: video.thumbnailUrl,
                                            token: downloadToken,
                                            activeBucketName,
                                            downloadUrl
                                        })}
                                    >
                                        {/* 다중 소스: 브라우저가 재생 가능한 첫 번째 소스를 자동 선택 */}
                                        <source src={videoUrlWithAuth} type="video/mp4" />
                                        <source src={videoUrlWithAuth} type="video/webm" />
                                        <source src={videoUrlWithAuth} type="video/ogg" />
                                        이 브라우저에서는 비디오 재생이 지원되지 않습니다.
                                    </video>
                                ) : video.videoUrl && videoPlayError ? (
                                    /* 재생 실패 시 에러 안내 */
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-5 text-3xl">
                                            ⚠️
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-white">재생할 수 없는 영상</h3>
                                        <p className="text-text-secondary max-w-md mb-2 text-sm">
                                            이 영상은 현재 브라우저에서 지원하지 않는 코덱(H.265/HEVC 등)으로 인코딩되어 있을 수 있습니다.
                                        </p>
                                        <p className="text-text-tertiary max-w-md mb-6 text-xs">
                                            💡 Chrome, Edge 또는 Safari 최신 버전을 사용해 보세요. 또는 다운로드 후 VLC, PotPlayer 등의 미디어 플레이어로 감상하실 수 있습니다.
                                        </p>
                                        <div className="flex gap-3">
                                            {!isDownloadLocked && (
                                                <button
                                                    onClick={handleDownload}
                                                    className="px-6 py-2.5 bg-accent-primary text-black rounded-full font-bold hover:scale-105 transition-transform"
                                                >
                                                    📥 다운로드하여 시청
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setVideoPlayError(false)}
                                                className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
                                            >
                                                🔄 다시 시도
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-center p-8">
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

                                {(video.minStreamingLevel && video.minStreamingLevel !== 'guest') && (
                                    <span className="absolute top-5 left-5 z-20 bg-accent-primary text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg uppercase">
                                        ⭐ {video.minStreamingLevel}
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
                                        <span>📅 {formatDate(video.createdAt || video.uploadedAt)}</span>
                                        <span>⏱ {video.duration}</span>
                                    </div>

                                    {/* Tags */}
                                    {video.tags && video.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {video.tags.map(tag => (
                                                <Link
                                                    key={tag}
                                                    href={`/tags/${encodeURIComponent(tag.replace(/^#/, ''))}`}
                                                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-secondary hover:text-white hover:bg-white/10 hover:border-accent-primary transition-colors"
                                                >
                                                    #{tag.replace(/^#/, '')}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
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
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary border border-white/10 rounded-full hover:border-accent-primary hover:text-accent-primary transition-all"
                                >
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
                                <div className="relative w-14 h-14 rounded-full overflow-hidden">
                                    {/* Gradient fallback */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${video.gradient}`} />
                                    {/* Profile image overlay */}
                                    {streamer?.profileImage && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={getMediaUrl({
                                                url: streamer.profileImage,
                                                token: downloadToken,
                                                activeBucketName,
                                                downloadUrl
                                            })}
                                            alt={streamer.name}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold text-lg">@{video.streamerName} {streamer?.koreanName && <span className="text-text-secondary text-sm">({streamer.koreanName})</span>}</div>
                                    <div className="text-sm text-text-secondary">{streamer?.videoCount || 0} Videos</div>
                                    <span className="text-sm text-text-secondary">{video.duration} 동안 이어지는 환상적인 퍼포먼스를 시청하세요!</span>
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
                            {relatedVideos.map((v) => (
                                <RelatedVideoCard key={v.id} video={v} />
                            ))}
                        </div>
                    </aside>
                </div>
            </div>

            <Footer />
        </div>
    )
}
