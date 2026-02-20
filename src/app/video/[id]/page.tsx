import { Metadata, ResolvingMetadata } from 'next'
import { initialVideos, initialStreamers } from '@/data/initialData'
import VideoClient from './VideoClient'
import { getDatabase } from '@/lib/b2'
import { VideoSchema, PersonSchema, BreadcrumbSchema } from '@/components/JsonLd'

interface PageProps {
    params: { id: string }
}

const BASE_URL = 'https://kdance.xyz'

/**
 * Safely parse a date string to ISO format.
 * Rejects relative dates like '1d ago', '2w ago'.
 */
function safeISODate(dateStr: string | undefined | null): string | null {
    if (!dateStr) return null
    if (/\d+[dhwm]\s*ago/i.test(dateStr)) return null
    if (/ago$/i.test(dateStr)) return null
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return null
        if (d.getFullYear() < 2000 || d.getFullYear() > 2100) return null
        return d.toISOString()
    } catch {
        return null
    }
}

async function getVideoData(id: string) {
    // 1. Try B2 Database
    const db = await getDatabase()
    if (db && db.videos) {
        const video = db.videos.find((v: any) => v.id === id)
        if (video) {
            const streamer = db.streamers.find((s: any) => s.id === video.streamerId)
            return { video, streamer, db }
        }
    }

    // 2. Fallback to Initial Data
    const video = initialVideos.find((v) => v.id === id)
    const streamer = video ? initialStreamers.find(s => s.id === video.streamerId) : undefined
    return { video, streamer, db: null }
}

export async function generateMetadata(
    { params }: PageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { video, streamer } = await getVideoData(params.id)

    if (!video) {
        return {
            title: 'Video Not Found - kStreamer dance',
        }
    }

    const streamerName = streamer?.name || video.streamerName || 'Unknown'
    const streamerKoreanName = streamer?.koreanName || ''
    const tags = video.tags?.map((t: string) => t.replace('#', '')) || []
    const thumbnail = video.thumbnailUrl || `${BASE_URL}/og-image.png`
    const previewImage = video.previewGifUrl || thumbnail
    const previewImageType = video.previewGifUrl ? 'image/gif' : 'image/webp'

    // Build rich description with tags and streamer info for search engines
    const tagString = tags.length > 0 ? ` Tags: ${tags.join(', ')}.` : ''
    const description = `Watch ${streamerName}${streamerKoreanName ? ` (${streamerKoreanName})` : ''} - ${video.title}. ${video.duration} dance performance.${tagString} Exclusive content on kStreamer dance.`

    // Combined keywords: tags + streamer names + video title words
    const keywords = [
        ...tags,
        streamerName,
        ...(streamerKoreanName ? [streamerKoreanName] : []),
        ...video.title.split(/[\s_\-]+/).filter((w: string) => w.length > 1),
        'kstreamer', 'dance', 'streaming',
        '댄스 영상', '스트리머 댄스', '댄스 퍼포먼스', '케이팝 댄스',
    ]

    return {
        title: `${video.title} | @${streamerName} - kStreamer dance`,
        description,
        keywords,
        openGraph: {
            title: `${video.title} - ${streamerName}${streamerKoreanName ? ` (${streamerKoreanName})` : ''}`,
            description,
            url: `${BASE_URL}/video/${params.id}`,
            siteName: 'kStreamer dance',
            images: [
                {
                    url: previewImage,
                    width: 1280,
                    height: 720,
                    alt: `${video.title} - ${streamerName} dance video thumbnail`,
                    type: previewImageType,
                },
            ],
            locale: 'ko_KR',
            type: 'video.other',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${video.title} - ${streamerName}`,
            description,
            images: [{
                url: previewImage,
                alt: `${video.title} - ${streamerName}`,
            }],
            creator: `@${streamerName}`,
        },
        alternates: {
            canonical: `${BASE_URL}/video/${params.id}`,
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-video-preview': -1,
            'max-snippet': -1,
        },
        other: {
            // Additional meta tags for better discoverability
            'article:tag': tags.join(','),
            'article:author': streamerName,
            'article:published_time': safeISODate(video.createdAt) || new Date().toISOString(),
        },
    }
}

export default async function VideoPage({ params }: PageProps) {
    const { video, streamer, db } = await getVideoData(params.id)
    const { id } = params

    // Get all available videos for recommendations
    const allAvailableVideos = db && db.videos ? [...db.videos] : [...initialVideos]

    // Filter current video and shuffle
    const shuffledRelated = allAvailableVideos
        .filter(v => v.id !== id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 12)

    if (!video) {
        return (
            <VideoClient
                relatedVideos={shuffledRelated}
                fallbackId={id}
            />
        )
    }

    const streamerName = streamer?.name || video.streamerName || 'Unknown'
    const streamerKoreanName = streamer?.koreanName || ''
    const thumbnail = video.thumbnailUrl || `${BASE_URL}/og-image.png`
    const tags = video.tags || []

    // Convert duration "7:42" to ISO 8601 "PT7M42S"
    let isoDuration = 'PT5M'
    if (video.duration && video.duration.includes(':')) {
        const parts = video.duration.split(':')
        if (parts.length === 2) {
            isoDuration = `PT${parts[0]}M${parts[1]}S`
        } else if (parts.length === 3) {
            isoDuration = `PT${parts[0]}H${parts[1]}M${parts[2]}S`
        }
    }

    return (
        <>
            {/* Video Structured Data - for Google Video Search & Rich Results */}
            <VideoSchema
                name={video.title}
                description={`${streamerName}${streamerKoreanName ? ` (${streamerKoreanName})` : ''}의 댄스 비디오. ${video.duration} 동안의 퍼포먼스. ${tags.map((t: string) => `#${t.replace('#', '')}`).join(' ')}`}
                thumbnailUrl={thumbnail}
                uploadDate={safeISODate(video.createdAt) || new Date().toISOString()}
                duration={isoDuration}
                embedUrl={`${BASE_URL}/video/${video.id}`}
                contentUrl={video.isVip ? undefined : video.videoUrl}
                author={streamerName}
                authorUrl={streamer ? `${BASE_URL}/actors/${streamer.id}` : undefined}
                authorImage={streamer?.profileImage}
                tags={tags}
                views={video.views}
                likes={video.likes}
                videoId={video.id}
            />

            {/* Streamer structured data on video page */}
            {streamer && (
                <PersonSchema
                    name={streamerName}
                    alternateName={streamerKoreanName || undefined}
                    url={`${BASE_URL}/actors/${streamer.id}`}
                    image={streamer.profileImage}
                    description={`${streamerName} - kStreamer dance content creator`}
                    followerCount={streamer.followers}
                />
            )}

            {/* Breadcrumb for navigation hierarchy */}
            <BreadcrumbSchema
                items={[
                    { name: 'Home', url: BASE_URL },
                    { name: 'Videos', url: `${BASE_URL}/videos` },
                    { name: streamerName, url: streamer ? `${BASE_URL}/actors/${streamer.id}` : `${BASE_URL}/actors` },
                    { name: video.title, url: `${BASE_URL}/video/${video.id}` },
                ]}
            />

            <VideoClient
                relatedVideos={shuffledRelated}
                fallbackId={id}
            />
        </>
    )
}
