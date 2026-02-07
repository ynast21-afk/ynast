import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { getValidGradient } from '@/utils/ui'
import { useStreamers } from '@/contexts/StreamerContext'

interface VideoCardProps {
    id: string
    title: string
    creator: string
    views: string
    duration: string
    isVip?: boolean
    gradient?: string
    videoUrl?: string
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
    uploadedAt,
    aspectRatio = 'video'
}: VideoCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const { downloadToken } = useStreamers()
    const videoRef = useRef<HTMLVideoElement>(null)
    const displayGradient = getValidGradient(gradient)

    useEffect(() => {
        if (isHovered && videoRef.current) {
            videoRef.current.play().catch(err => {
                // Ignore autoplay errors (muted video should usually be fine)
                console.log('Autoplay blocked or failed:', err)
            })
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [isHovered])

    const videoSrcWithAuth = videoUrl && videoUrl.includes('backblazeb2.com') && downloadToken
        ? `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
        : videoUrl

    return (
        <Link href={`/video/${id}`} className="group block">
            <div
                className="bg-bg-secondary rounded-xl overflow-hidden card-hover cursor-pointer border border-[var(--border-color)] relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Thumbnail / Preview Area */}
                <div className={`relative ${aspectRatio === 'portrait' ? 'aspect-[4/5]' : 'aspect-video'} bg-gradient-to-br ${displayGradient} transition-all duration-300`}>

                    {/* VIP Badge */}
                    {isVip && (
                        <span className="absolute top-2 left-2 z-20 bg-accent-primary text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                            VIP
                        </span>
                    )}

                    {/* View Count Badge */}
                    <span className="absolute top-2 right-2 z-20 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                        👁 {views}
                    </span>

                    {/* Video Preview (Only on focus/hover) */}
                    {isHovered && videoUrl && (
                        <div className="absolute inset-0 z-10 bg-black transition-opacity duration-300">
                            <video
                                ref={videoRef}
                                src={videoSrcWithAuth}
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 z-20 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white">
                        {duration}
                    </span>

                    {/* Uploaded Time (Optional, only for portrait/grid) */}
                    {uploadedAt && (
                        <span className="absolute bottom-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploadedAt}
                        </span>
                    )}

                    {/* Play Button Icon Overlay (Hide when video is playing) */}
                    {!isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-10">
                            <div className="w-12 h-12 rounded-full bg-accent-primary/90 flex items-center justify-center shadow-lg">
                                <span className="text-black text-xl ml-1">▶</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-3">
                    <h3 className="text-sm font-medium line-clamp-2 mb-1 text-white group-hover:text-accent-primary transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-text-tertiary">@{creator}</p>
                        {uploadedAt && <span className="text-[10px] text-text-tertiary">{uploadedAt}</span>}
                    </div>
                </div>
            </div>
        </Link>
    )
}
