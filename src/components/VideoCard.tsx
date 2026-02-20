import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
// gradient 로직 제거됨 - 단색/그라디언트 배경 사용하지 않음
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
    orientation?: 'horizontal' | 'vertical'
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
    minDownloadLevel = 'guest',
    orientation
}: VideoCardProps) {
    // 세로 영상 자동 감지: orientation prop으로 즉시 판단하거나, 썸네일 로드 시 비율로 자동 감지
    const [detectedVertical, setDetectedVertical] = useState(false)
    const isVertical = orientation === 'vertical' || detectedVertical
    const objectFitClass = isVertical ? 'object-contain' : 'object-cover'
    const [isHovering, setIsHovering] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(-1)
    const [imgError, setImgError] = useState(false)
    const [autoPosterUrl, setAutoPosterUrl] = useState<string | null>(null)
    const [autoDetectedDuration, setAutoDetectedDuration] = useState<string | null>(null)
    const { downloadToken, downloadUrl, activeBucketName } = useStreamers()
    const { user } = useAuth()

    const { ref: inViewRef, isInView } = useInView({ threshold: 0.1, rootMargin: '100px' })


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

    // thumbnailUrl이 없고 videoUrl이 있을 때, 자동으로 영상 첫 프레임 캡처 + duration 감지
    useEffect(() => {
        if (thumbnailUrl || !videoUrl || !isInView || autoPosterUrl) return
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.muted = true
        video.preload = 'metadata'
        video.src = videoSrcWithAuth

        const handleMetadata = () => {
            // duration 감지
            const dur = video.duration
            if (dur && isFinite(dur) && dur > 0 && duration === '0:00') {
                const ts = Math.round(dur)
                const h = Math.floor(ts / 3600), m = Math.floor((ts % 3600) / 60), s = ts % 60
                const formatted = h > 0
                    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                    : `${m}:${String(s).padStart(2, '0')}`
                setAutoDetectedDuration(formatted)
                // DB에 영구 저장
                fetch('/api/db/update-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId: id, duration: formatted }),
                }).catch(() => { /* 실패 무시 */ })
            }
            // 3초 지점에서 프레임 캡처
            video.currentTime = Math.min(3, dur * 0.1 || 3)
        }

        const handleSeeked = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = video.videoWidth || 640
                canvas.height = video.videoHeight || 360
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                    if (dataUrl && dataUrl.length > 100) setAutoPosterUrl(dataUrl)
                }
            } catch { /* CORS 등 에러 무시 */ }
            video.removeEventListener('seeked', handleSeeked)
            video.src = ''
            video.load()
        }
        video.addEventListener('loadedmetadata', handleMetadata, { once: true })
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('error', () => { video.src = ''; video.load() })
        // 15초 타임아웃
        setTimeout(() => { video.removeEventListener('seeked', handleSeeked); video.src = ''; video.load() }, 15000)
    }, [thumbnailUrl, videoUrl, isInView, videoSrcWithAuth, autoPosterUrl, duration, id])

    // 세로 영상: 배경이미지 비활성화 → 검정 배경 + object-contain으로 pillarbox 효과
    const backgroundStyle = isVertical
        ? { backgroundColor: '#0a0a0a' }
        : thumbnailUrl
            ? { backgroundImage: `url(${thumbnailWithAuth})`, backgroundSize: 'cover' as const, backgroundPosition: 'center' }
            : autoPosterUrl
                ? { backgroundImage: `url(${autoPosterUrl})`, backgroundSize: 'cover' as const, backgroundPosition: 'center' }
                : { backgroundColor: '#0a0a0a' }

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
                                alt={`${title} - ${creator} 댄스 영상 썬네일`}
                                fill
                                className={`${objectFitClass} transition-opacity duration-300 ${showingFrames ? 'opacity-0' : 'opacity-100'}`}
                                unoptimized
                                loading="lazy"
                                onError={() => setImgError(true)}
                                onLoad={(e) => {
                                    // 썸네일 로드 시 세로 비율 자동 감지
                                    const img = e.target as HTMLImageElement
                                    if (img.naturalHeight > img.naturalWidth && !detectedVertical && orientation !== 'vertical') {
                                        setDetectedVertical(true)
                                    }
                                }}
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
                                        alt={`${title} - ${creator} 댄스 미리보기 ${idx + 1}`}
                                        fill
                                        className={objectFitClass}
                                        unoptimized
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={url}
                                        alt={`${title} - ${creator} 댄스 미리보기 ${idx + 1}`}
                                        className={`w-full h-full ${objectFitClass}`}
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
                        {autoDetectedDuration || duration}
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
                        {uploadedAt && <span className="text-[10px] text-text-tertiary">{(() => {
                            try {
                                const d = new Date(uploadedAt)
                                if (isNaN(d.getTime())) return uploadedAt
                                return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}.`
                            } catch { return uploadedAt }
                        })()}</span>}
                    </div>
                </div>
            </div>
        </Link>
    )
}
