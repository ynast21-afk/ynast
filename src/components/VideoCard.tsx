import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { getValidGradient, getGradientStyle } from '@/utils/ui'
import { formatDate } from '@/utils/date'
import { useStreamers } from '@/contexts/StreamerContext'
import { useInView } from '@/hooks/useInView'
import { useVideoPreview } from '@/hooks/useVideoPreview'
import { Video } from '@/data/initialData'
import { useAuth } from '@/contexts/AuthContext'

import { hasAccess } from '@/utils/membership'
import { getMediaUrl } from '@/utils/b2url'

interface VideoCardProps {
    id: string
    title: string
    creator: string
    views: number
    duration: string
    isVip?: boolean
    gradient?: string
    videoUrl?: string
    thumbnailUrl?: string
    uploadedAt?: string
    createdAt?: string
    aspectRatio?: 'video' | 'portrait'
    previewUrls?: string[]
    minStreamingLevel?: string
    minDownloadLevel?: string
}

export default function VideoCard({
    id,
    title,
    creator,
    views,
    duration,
    isVip = false,
    gradient,
    videoUrl,
    thumbnailUrl,
    uploadedAt,
    createdAt,
    aspectRatio = 'video',
    previewUrls = [],
    minStreamingLevel = 'guest',
    minDownloadLevel = 'guest'
}: VideoCardProps) {
    const [isHovering, setIsHovering] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(-1)
    const [imgError, setImgError] = useState(false)
    const { downloadToken, downloadUrl, activeBucketName } = useStreamers()
    const { user } = useAuth()

    const { ref: inViewRef, isInView } = useInView({ threshold: 0.1, rootMargin: '100px' })
    const displayGradient = getValidGradient(gradient)

    // Pre-calculate preview URLs with auth
    const authPreviewUrls = (previewUrls || []).map(url => getMediaUrl({
        url,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    }))

    const hasImagePreviews = authPreviewUrls.length > 0

    const videoSrcWithAuth = getMediaUrl({
        url: videoUrl,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    })

    const thumbnailWithAuth = getMediaUrl({
        url: thumbnailUrl,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    })

    // 🎬 비디오 프레임 미리보기 훅 - previewUrls가 없을 때 사용
    const {
        frameUrls: capturedFrames,
        activeIndex: capturedActiveIndex,
        isLoading: isCapturing,
        startPreview: startCapturedPreview,
        stopPreview: stopCapturedPreview,
    } = useVideoPreview({
        videoUrl: videoSrcWithAuth,
        frameCount: 5,
        intervalMs: 1000,
        enabled: !hasImagePreviews && !!videoUrl,
    })

    const hasCapturedFrames = capturedFrames.length > 0

    const backgroundStyle = thumbnailUrl
        ? { backgroundImage: `url(${thumbnailWithAuth})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : gradient ? getGradientStyle(displayGradient) : { backgroundColor: '#0a0a0a' }

    const handleMouseEnter = () => {
        setIsHovering(true)
        if (!hasImagePreviews && videoUrl) {
            startCapturedPreview()
        }
    }

    const handleMouseLeave = () => {
        setIsHovering(false)
        setPreviewIndex(-1)
        if (!hasImagePreviews) {
            stopCapturedPreview()
        }
    }

    // Image Cycling Effect (기존 previewUrls 사용 시)
    useEffect(() => {
        let intervalId: NodeJS.Timeout
        if (isHovering && hasImagePreviews) {
            setPreviewIndex(0)
            intervalId = setInterval(() => {
                setPreviewIndex(prev => (prev + 1) % authPreviewUrls.length)
            }, 1000)
        } else {
            setPreviewIndex(-1)
        }
        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [isHovering, hasImagePreviews, authPreviewUrls.length])

    const displayDate = formatDate(createdAt || uploadedAt)

    // 현재 활성화된 프레임 인덱스 결정 (기존 previewUrls vs 캡처된 프레임)
    const currentFrameIndex = hasImagePreviews ? previewIndex : capturedActiveIndex
    const currentFrameUrls = hasImagePreviews ? authPreviewUrls : capturedFrames
    const showingFrames = isHovering && currentFrameUrls.length > 0 && currentFrameIndex >= 0

    return (
        <Link href={`/video/${id}`} className="group block">
            <div
                ref={inViewRef}
                className="bg-[#1a1a1a] rounded-xl overflow-hidden card-hover cursor-pointer border border-white/5 relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Thumbnail / Preview Area */}
                <div
                    className={`relative ${aspectRatio === 'portrait' ? 'aspect-[4/5]' : 'aspect-video'} transition-all duration-300 overflow-hidden bg-[#0a0a0a]`}
                    style={backgroundStyle}
                >
                    {/* Preload Layer: Hidden images to force browser caching when in view */}
                    {isInView && hasImagePreviews && (
                        <div className="hidden">
                            {authPreviewUrls.slice(0, 3).map((url, idx) => (
                                <img key={idx} src={url} alt="" />
                            ))}
                        </div>
                    )}

                    {/* Layer 1: Thumbnail / Preview Cycling Layout */}
                    <div className="absolute inset-0 z-10">
                        {/* Main Thumbnail (visible when not hovering or between previews) */}
                        {!imgError && thumbnailUrl && (
                            <Image
                                src={thumbnailWithAuth}
                                alt={`${title} - ${creator} dance video`}
                                fill
                                className={`object-cover transition-opacity duration-300 ${showingFrames ? 'opacity-0' : 'opacity-100'}`}
                                unoptimized
                                priority={isInView}
                                onError={() => setImgError(true)}
                            />
                        )}

                        {/* Frame Previews (image previewUrls OR captured video frames) */}
                        {isHovering && currentFrameUrls.map((url, idx) => (
                            <div
                                key={idx}
                                className={`absolute inset-0 transition-opacity duration-200 ${currentFrameIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                            >
                                {hasImagePreviews ? (
                                    <Image
                                        src={url}
                                        alt={`${title} preview ${idx}`}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={url}
                                        alt={`${title} frame ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Loading indicator while capturing frames */}
                    {isHovering && isCapturing && !hasCapturedFrames && (
                        <div className="absolute inset-0 z-25 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Preview Progress Bar */}
                    {showingFrames && (
                        <div className="absolute bottom-0 left-0 right-0 z-35 flex gap-[2px] px-1 pb-[2px]">
                            {currentFrameUrls.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${currentFrameIndex === idx
                                        ? 'bg-accent-primary shadow-[0_0_6px_rgba(var(--accent-primary-rgb),0.6)]'
                                        : 'bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>
                    )}


                    {/* Access Level Badge */}
                    {(minStreamingLevel && minStreamingLevel !== 'guest') && (
                        <span className={`absolute top-1 left-1 ${!hasAccess(minStreamingLevel, user?.membership) ? 'bg-red-500' : 'bg-accent-primary'} text-black px-1.5 py-0.5 rounded text-[10px] font-bold z-30 uppercase`}>
                            {minStreamingLevel}
                        </span>
                    )}

                    {/* View Count Badge */}
                    <span className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white">
                        👁 {views}
                    </span>

                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 z-20 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                        {duration}
                    </span>

                    {/* Uploaded Time (Formatted) */}
                    {displayDate && (
                        <span className="absolute bottom-2 left-2 z-20 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white/80 font-mono">
                            {displayDate}
                        </span>
                    )}

                    {/* Play Button Icon Overlay (Subtle) */}
                    {!isHovering && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-30">
                            <div className="w-10 h-10 rounded-full bg-accent-primary/80 flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                                <span className="text-black text-lg ml-0.5">▶</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-3">
                    <h3 className="text-[13px] font-medium line-clamp-1 mb-1 text-white group-hover:text-accent-primary transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] text-text-tertiary">@{creator}</p>
                        {uploadedAt && <span className="text-[10px] text-text-tertiary">{uploadedAt}</span>}
                    </div>
                </div>
            </div>
        </Link>
    )
}
