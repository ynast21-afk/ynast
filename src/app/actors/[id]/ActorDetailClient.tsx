'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import VideoCard from '@/components/VideoCard'
import { useStreamers } from '@/contexts/StreamerContext'
import { Video } from '@/data/initialData'
import { useAuth } from '@/contexts/AuthContext'
import { hasAccess } from '@/utils/membership'
import { getMediaUrl } from '@/utils/b2url'

// Helper to generate token for API calls
function getToken(user: any) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(user))))
    } catch (e) {
        return ''
    }
}

interface ActorDetailClientProps {
    streamer: any
    videos: any[]
    downloadToken: string | null
}

export default function ActorDetailClient({ streamer, videos, downloadToken: serverToken }: ActorDetailClientProps) {
    const { downloadToken: clientToken, downloadUrl, activeBucketName, toggleStreamerFollow } = useStreamers()
    const { user } = useAuth()
    const videoRef = useRef<HTMLVideoElement>(null)
    const downloadToken = serverToken || clientToken

    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(streamer.followers || 0)

    useEffect(() => {
        // 1. Load from localStorage cache first (instant)
        const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
        if (savedFollows) {
            const followedIds = JSON.parse(savedFollows)
            if (followedIds.includes(streamer.id)) {
                setIsFollowing(true)
            }
        }

        // 2. Load from B2 server (async)
        if (user) {
            const token = getToken(user)
            if (token) {
                fetch('/api/user/social', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.follows) {
                            setIsFollowing(data.follows.includes(streamer.id))
                            localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(data.follows))
                        }
                    })
                    .catch(err => console.error('Failed to load follows from server:', err))
            }
        }
    }, [streamer.id, user])

    const handleFollow = () => {
        if (!user) {
            alert('Please login to follow streamers!')
            return
        }

        const newFollowingState = !isFollowing

        // Optimistic UI update
        setIsFollowing(newFollowingState)
        setFollowerCount((prev: number) => Math.max(0, prev + (newFollowingState ? 1 : -1)))

        // 1. Update User's Follow List (Local + B2 /api/user/social)
        const savedFollows = localStorage.getItem('kstreamer_followed_streamers')
        let followedIds = savedFollows ? JSON.parse(savedFollows) : []

        if (newFollowingState) {
            followedIds.push(streamer.id)
        } else {
            followedIds = followedIds.filter((id: string) => id !== streamer.id)
        }
        localStorage.setItem('kstreamer_followed_streamers', JSON.stringify(followedIds))

        const token = getToken(user)
        if (token) {
            fetch('/api/user/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type: 'follow', action: newFollowingState ? 'add' : 'remove', targetId: streamer.id })
            }).catch(err => console.error('Failed to sync follow:', err))
        }

        // 2. Update Streamer's Total Follower Count (Context -> /api/stats)
        toggleStreamerFollow(streamer.id, newFollowingState)
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

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
                        <div className={`relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${streamer.gradient}`}>
                            {streamer.profileImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={getMediaUrl({
                                        url: streamer.profileImage,
                                        token: downloadToken,
                                        activeBucketName,
                                        downloadUrl
                                    })}
                                    alt={streamer.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl">👤</span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-1">{streamer.name}</h1>
                                    {streamer.koreanName && (
                                        <p className="text-text-secondary text-lg mb-2">{streamer.koreanName}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${isFollowing
                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                        : 'bg-accent-primary text-black hover:bg-accent-secondary shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                                        }`}
                                >
                                    {isFollowing ? (
                                        <>
                                            <span>✓</span>
                                            <span>Following</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>+</span>
                                            <span>Follow</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-sm mt-2">
                                <span className="text-white/80 font-medium flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{followerCount.toLocaleString()}</span>
                                    <span className="text-text-secondary font-normal">Followers</span>
                                </span>
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
                            <p className="text-text-secondary">This actor hasn&apos;t uploaded any videos yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                            {videos.map((video: any) => (
                                <VideoCard
                                    key={video.id}
                                    id={video.id}
                                    title={video.title}
                                    creator={video.streamerName}
                                    views={video.views}
                                    duration={video.duration}
                                    isVip={video.isVip}
                                    gradient={video.gradient}
                                    videoUrl={video.videoUrl}
                                    thumbnailUrl={video.thumbnailUrl}
                                    uploadedAt={video.uploadedAt}
                                    createdAt={video.createdAt}
                                    previewUrls={video.previewUrls}
                                    minStreamingLevel={video.minStreamingLevel}
                                    minDownloadLevel={video.minDownloadLevel}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
