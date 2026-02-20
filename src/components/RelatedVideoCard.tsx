'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { formatDate } from '@/utils/date'
import { useStreamers } from '@/contexts/StreamerContext'
import { useInView } from '@/hooks/useInView'
import { useVideoPreview } from '@/hooks/useVideoPreview'
import { Video } from '@/data/initialData'
import { useAuth } from '@/contexts/AuthContext'

import { hasAccess } from '@/utils/membership'
import { getMediaUrl } from '@/utils/b2url'

interface RelatedVideoCardProps {
    video: Video
}

export default function RelatedVideoCard({ video: v }: RelatedVideoCardProps) {
    const [isHovering, setIsHovering] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(-1)
    const [imgError, setImgError] = useState(false)
    const { downloadToken, downloadUrl, activeBucketName, streamers } = useStreamers()
    const { user } = useAuth()

    const { ref: inViewRef, isInView } = useInView({ threshold: 0.1, rootMargin: '100px' })

    // Pre-calculate URLs
    const thumbnailWithAuth = getMediaUrl({
        url: v.thumbnailUrl,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    })

    const authPreviewUrls = (v.previewUrls || []).map(url => getMediaUrl({
        url,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    }))

    const hasImagePreviews = authPreviewUrls.length > 0

    const videoSrcWithAuth = getMediaUrl({
        url: v.videoUrl,
        token: downloadToken,
        activeBucketName,
        downloadUrl
    })

    // 🎬 비디오 프레임 미리보기 훅 - previewUrls가 없을 때 비디오에서 프레임 캡처
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
        enabled: !hasImagePreviews && !!v.videoUrl,
    })

    const hasCapturedFrames = capturedFrames.length > 0

    // Background style for flash-less loading
    const backgroundStyle = v.thumbnailUrl
        ? { backgroundImage: `url(${thumbnailWithAuth})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: '#0a0a0a' }

    // Previews cycling effect (기존 previewUrls 사용 시)
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

    const handleMouseEnter = () => {
        setIsHovering(true)
        if (!hasImagePreviews && v.videoUrl) {
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

    // 현재 활성 프레임 결정
    const currentFrameIndex = hasImagePreviews ? previewIndex : capturedActiveIndex
    const currentFrameUrls = hasImagePreviews ? authPreviewUrls : capturedFrames
    const showingFrames = isHovering && currentFrameUrls.length > 0 && currentFrameIndex >= 0

    return (
        <Link
            href={`/video/${v.id}`}
            className="flex gap-3 group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                ref={inViewRef}
                className="w-40 h-[90px] bg-[#0a0a0a] rounded-lg flex-shrink-0 relative overflow-hidden group-hover:ring-2 ring-accent-primary/50 transition-all border border-white/5"
                style={backgroundStyle}
            >
                {/* Preload Layer */}
                {isInView && hasImagePreviews && (
                    <div className="hidden">
                        {authPreviewUrls.slice(0, 3).map((url, idx) => (
                            <img key={idx} src={url} alt="" />
                        ))}
                    </div>
                )}

                {/* Layer 1: Thumbnail + Frame Previews */}
                <div className="absolute inset-0 z-10">
                    {!imgError && v.thumbnailUrl && (
                        <Image
                            src={thumbnailWithAuth}
                            alt=""
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
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Loading indicator while capturing frames */}
                {isHovering && isCapturing && !hasCapturedFrames && (
                    <div className="absolute inset-0 z-25 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {/* Preview Progress Bar */}
                {showingFrames && (
                    <div className="absolute bottom-0 left-0 right-0 z-35 flex gap-[1px] px-0.5 pb-[1px]">
                        {currentFrameUrls.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-[2px] flex-1 rounded-full transition-all duration-300 ${currentFrameIndex === idx
                                    ? 'bg-accent-primary'
                                    : 'bg-white/20'
                                    }`}
                            />
                        ))}
                    </div>
                )}


                {(v.minStreamingLevel && v.minStreamingLevel !== 'guest') && (
                    <span className={`absolute top-1 left-1 ${!hasAccess(v.minStreamingLevel, user?.membership) ? 'bg-red-500' : 'bg-accent-primary'} text-black px-1.5 py-0.5 rounded text-[10px] font-bold z-30 uppercase`}>
                        {v.minStreamingLevel}
                    </span>
                )}
                <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[11px] z-30 text-white">
                    {v.duration}
                </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-accent-primary transition-colors text-white">
                    {v.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
                    <span>{v.streamerName}{(() => { const s = streamers.find(st => st.name === v.streamerName); return s?.koreanName ? ` (${s.koreanName})` : ''; })()}</span>
                    <span>•</span>
                    <span>조회수 {v.views}회</span>
                    <span>•</span>
                    <span>{formatDate(v.createdAt)}</span>
                </div>
            </div>
        </Link>
    )
}
