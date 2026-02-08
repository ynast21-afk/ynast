import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { getValidGradient, getGradientStyle } from '@/utils/ui'
import { useStreamers } from '@/contexts/StreamerContext'

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
    aspectRatio?: 'video' | 'portrait'
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
    aspectRatio = 'video'
}: VideoCardProps) {
    const [isHovering, setIsHovering] = useState(false)
    const { downloadToken, activeBucketName } = useStreamers()
    const videoRef = useRef<HTMLVideoElement>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const displayGradient = getValidGradient(gradient)

    const fixB2Url = (url: string) => {
        if (!url || !url.includes('backblazeb2.com/file/')) return url
        try {
            const parts = url.split('/')
            const fileIndex = parts.indexOf('file')
            if (fileIndex !== -1 && parts.length > fileIndex + 1) {
                const currentBucket = parts[fileIndex + 1]
                if (currentBucket !== activeBucketName && activeBucketName) {
                    parts[fileIndex + 1] = activeBucketName
                    return parts.join('/')
                }
            }
        } catch (e) { }
        return url
    }

    const parseDuration = (durationStr: string): number => {
        if (!durationStr || durationStr === '?') return 60
        const parts = durationStr.split(':').map(Number)
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        return 60
    }

    const durationInSeconds = parseDuration(duration)

    // Only prepare the video source if hovered (Lazy Loading) or if we need it for an immediate preview
    const rawVideoUrl = fixB2Url(videoUrl || "")
    const videoSrcWithAuth = (isHovering || !thumbnailUrl) && rawVideoUrl && rawVideoUrl.includes('backblazeb2.com') && downloadToken
        ? `${rawVideoUrl}${rawVideoUrl.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
        : (isHovering || !thumbnailUrl) ? rawVideoUrl : ""

    const rawThumbnailUrl = fixB2Url(thumbnailUrl || "")
    const thumbnailWithAuth = rawThumbnailUrl && rawThumbnailUrl.includes('backblazeb2.com') && downloadToken
        ? `${rawThumbnailUrl}${rawThumbnailUrl.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
        : rawThumbnailUrl

    const backgroundStyle = thumbnailUrl
        ? { backgroundImage: `url(${thumbnailWithAuth})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : getGradientStyle(displayGradient)

    const handleMouseEnter = () => {
        setIsHovering(true)
        if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => { })
        }
    }

    const handleMouseLeave = () => {
        setIsHovering(false)
        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }

    useEffect(() => {
        let animationFrameId: number = 0
        let lastResetTime = Date.now()

        const checkTime = () => {
            if (videoRef.current && isHovering) {
                const currentTime = videoRef.current.currentTime
                if (currentTime >= 5 || (Date.now() - lastResetTime > 5500)) {
                    videoRef.current.currentTime = 0
                    lastResetTime = Date.now()
                    videoRef.current.play().catch(() => { })
                }
                animationFrameId = requestAnimationFrame(checkTime)
            }
        }

        if (isHovering && videoRef.current) {
            videoRef.current.currentTime = 0
            lastResetTime = Date.now()
            videoRef.current.play().catch(() => { })
            animationFrameId = requestAnimationFrame(checkTime)
        } else {
            cancelAnimationFrame(animationFrameId)
        }

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [isHovering])

    return (
        <Link href={`/video/${id}`} className="group block">
            <div
                className="bg-[#1a1a1a] rounded-xl overflow-hidden card-hover cursor-pointer border border-white/5 relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Thumbnail / Preview Area */}
                <div
                    className={`relative ${aspectRatio === 'portrait' ? 'aspect-[4/5]' : 'aspect-video'} transition-all duration-500 overflow-hidden bg-black`}
                    style={!isHovering ? backgroundStyle : undefined}
                >
                    {/* Gradient Fallback */}
                    <div className="absolute inset-0 -z-10" style={getGradientStyle(displayGradient)} />

                    {/* Video Element for Preview */}
                    {videoUrl && (
                        <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${isHovering || !thumbnailUrl ? 'opacity-100' : 'opacity-0'}`}>
                            <video
                                ref={videoRef}
                                src={videoSrcWithAuth}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Gradient Fallback (Explicit for no video & no thumbnail) */}
                    {!videoUrl && !thumbnailUrl && (
                        <div className="absolute inset-0 z-0" style={getGradientStyle(displayGradient)} />
                    )}

                    {/* VIP Badge */}
                    {isVip && (
                        <span className="absolute top-2 left-2 z-20 bg-accent-primary text-black px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg">
                            VIP
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

                    {/* Uploaded Time */}
                    {uploadedAt && (
                        <span className="absolute bottom-2 left-2 z-20 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white/80">
                            {uploadedAt}
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
