import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { getValidGradient, getGradientStyle } from '@/utils/ui'
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

    const videoSrcWithAuth = videoUrl && videoUrl.includes('backblazeb2.com') && downloadToken
        ? `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
        : videoUrl

    useEffect(() => {
        if (isHovered && videoRef.current) {
            console.log(`[VideoCard Debug] Hovering on: ${title}`)
            console.log(`[VideoCard Debug] videoUrl: ${videoUrl || 'NONE'}`)
            console.log(`[VideoCard Debug] downloadToken present: ${!!downloadToken}`)
            console.log(`[VideoCard Debug] Final Src: ${videoSrcWithAuth || 'NONE'}`)

            videoRef.current.play().catch(err => {
                console.warn('[VideoCard Debug] Play error:', err)
            })
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [isHovered, videoUrl, downloadToken, title, videoSrcWithAuth])

    return (
        <Link href={`/video/${id}`} className="group block">
            <div
                className="bg-[#1a1a1a] rounded-xl overflow-hidden card-hover cursor-pointer border border-white/5 relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Thumbnail / Preview Area */}
                <div
                    className={`relative ${aspectRatio === 'portrait' ? 'aspect-[4/5]' : 'aspect-video'} transition-all duration-500 overflow-hidden`}
                    style={getGradientStyle(displayGradient)}
                >

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

                    {/* Video Preview (Only on focus/hover) */}
                    {isHovered && videoUrl && (
                        <div className="absolute inset-0 z-10 bg-black">
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
                    <span className="absolute bottom-2 right-2 z-20 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                        {duration}
                    </span>

                    {/* Uploaded Time (Contextual) */}
                    {uploadedAt && (
                        <span className="absolute bottom-2 left-2 z-20 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white/80">
                            {uploadedAt}
                        </span>
                    )}

                    {/* Play Button Icon Overlay (Subtle) */}
                    {!isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-10">
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
