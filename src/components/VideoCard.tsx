import Link from 'next/link'

interface VideoCardProps {
    id: string
    title: string
    creator: string
    views: string
    duration: string
    isVip?: boolean
    gradient?: string
}

export default function VideoCard({
    id,
    title,
    creator,
    views,
    duration,
    isVip = false,
    gradient = 'from-purple-900 to-cyan-900'
}: VideoCardProps) {
    return (
        <Link href={`/video/${id}`} className="block">
            <div className="bg-bg-secondary rounded-xl overflow-hidden card-hover cursor-pointer">
                {/* Thumbnail */}
                <div className={`relative aspect-video bg-gradient-to-br ${gradient}`}>
                    {/* View Count Badge */}
                    <span className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                        👁 {views}
                    </span>

                    {/* VIP Badge */}
                    {isVip && (
                        <span className="absolute top-2 right-2 bg-accent-primary text-black px-2 py-1 rounded text-xs font-bold">
                            VIP
                        </span>
                    )}

                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                        {duration}
                    </span>

                    {/* Play Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-accent-primary/90 flex items-center justify-center">
                            <span className="text-black text-lg ml-1">▶</span>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="p-3">
                    <h3 className="text-sm font-medium line-clamp-2 mb-1">{title}</h3>
                    <p className="text-xs text-text-secondary">@{creator}</p>
                </div>
            </div>
        </Link>
    )
}
