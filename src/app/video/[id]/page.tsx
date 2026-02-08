import { Metadata, ResolvingMetadata } from 'next'
import { initialVideos, initialStreamers } from '@/data/initialData'
import VideoClient from './VideoClient'
import { getDatabase } from '@/lib/b2'

interface PageProps {
    params: { id: string }
}

async function getVideoData(id: string) {
    // 1. Try B2 Database
    const db = await getDatabase()
    if (db && db.videos) {
        const video = db.videos.find((v: any) => v.id === id)
        if (video) {
            const streamer = db.streamers.find((s: any) => s.id === video.streamerId)
            return { video, streamer }
        }
    }

    // 2. Fallback to Initial Data
    const video = initialVideos.find((v) => v.id === id)
    const streamer = video ? initialStreamers.find(s => s.id === video.streamerId) : undefined
    return { video, streamer }
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
    const description = `Watch ${streamerName}'s latest performance. ${video.duration} of amazing dance! Exclusive VIP content available at kStreamer dance.`
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : 'http://localhost:3000'

    // Use thumbnail URL if available, otherwise fallback
    const thumbnail = video.thumbnailUrl || `${baseUrl}/og-image.png`

    return {
        title: `${video.title} | @${streamerName} - kStreamer dance`,
        description,
        openGraph: {
            title: video.title,
            description,
            url: `${baseUrl}/video/${params.id}`,
            siteName: 'kStreamer dance',
            images: [
                {
                    url: thumbnail,
                    width: 1200,
                    height: 630,
                    alt: video.title,
                },
            ],
            locale: 'ko_KR',
            type: 'video.other',
        },
        twitter: {
            card: 'summary_large_image',
            title: video.title,
            description,
            images: [thumbnail],
            creator: `@${streamerName}`,
        },
    }
}

export default async function VideoPage({ params }: PageProps) {
    const { video, streamer } = await getVideoData(params.id)
    const { id } = params

    const relatedVideos = initialVideos.filter(v => v.id !== id).slice(0, 10)

    if (!video) {
        return (
            <VideoClient
                relatedVideos={relatedVideos}
                fallbackId={id}
            />
        )
    }

    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : 'http://localhost:3000'
    const streamerName = streamer?.name || video.streamerName || 'Unknown'

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': video.title,
        'description': `${streamerName}의 새로운 댄스 비디오입니다. ${video.duration} 동안 이어지는 환상적인 퍼포먼스를 시청하세요!`,
        'thumbnailUrl': [
            video.thumbnailUrl || `${baseUrl}/og-image.png`
        ],
        'uploadDate': video.createdAt,
        'duration': video.duration.includes(':') ? `PT${video.duration.split(':')[0]}M${video.duration.split(':')[1]}S` : 'PT5M',
        'embedUrl': `${baseUrl}/video/${video.id}`,
        'interactionStatistic': {
            '@type': 'InteractionCounter',
            'interactionType': { '@type': 'WatchAction' },
            'userInteractionCount': (video.views || 0) * 1000 || 1000
        },
        'regionsAllowed': 'US,KR,JP',
        'author': {
            '@type': 'Person',
            'name': streamerName,
            'url': `${baseUrl}/videos?search=${streamerName}`
        }
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <VideoClient
                relatedVideos={relatedVideos}
                fallbackId={id}
            />
        </>
    )
}
