import { Metadata, ResolvingMetadata } from 'next'
import { initialVideos, initialStreamers } from '@/data/initialData'
import VideoClient from './VideoClient'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

interface PageProps {
    params: { id: string }
}

export async function generateMetadata(
    { params }: PageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const id = params.id
    const video = initialVideos.find((v) => v.id === id)

    if (!video) {
        return {
            title: 'Video Not Found - kStreamer dance',
        }
    }

    const description = `Watch ${video.streamerName}'s latest performance. ${video.duration} of amazing dance! Exclusive VIP content available at kStreamer dance.`
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : 'http://localhost:3000'

    // For now using the gradient as a theme color or a placeholder for thumbnail if real one exists
    // B2 doesn't easily provide thumbnails unless we generate them, but we can use the site icon or OG image
    const thumbnail = `${baseUrl}/og-image.png`

    return {
        title: `${video.title} | @${video.streamerName} - kStreamer dance`,
        description,
        openGraph: {
            title: video.title,
            description,
            url: `${baseUrl}/video/${id}`,
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
            creator: `@${video.streamerName}`,
        },
    }
}

export default function VideoPage({ params }: PageProps) {
    const { id } = params
    const video = initialVideos.find(v => v.id === id)
    const streamer = video ? initialStreamers.find(s => s.id === video.streamerId) : undefined
    const relatedVideos = initialVideos.filter(v => v.id !== id).slice(0, 10)

    if (!video) {
        // We pass fallbackId so VideoClient can try to find it in StreamerContext (localStorage)
        return (
            <VideoClient
                relatedVideos={relatedVideos}
                fallbackId={id}
            />
        )
    }

    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : 'http://localhost:3000'
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': video.title,
        'description': `${video.streamerName}의 새로운 댄스 비디오입니다. ${video.duration} 동안 이어지는 환상적인 퍼포먼스를 시청하세요!`,
        'thumbnailUrl': [
            `${baseUrl}/og-image.png`
        ],
        'uploadDate': video.createdAt,
        'duration': video.duration.includes(':') ? `PT${video.duration.split(':')[0]}M${video.duration.split(':')[1]}S` : 'PT5M', // Basic fallback
        'embedUrl': `${baseUrl}/video/${video.id}`,
        'interactionStatistic': {
            '@type': 'InteractionCounter',
            'interactionType': { '@type': 'WatchAction' },
            'userInteractionCount': (video.views || 0) * 1000 || 1000
        },
        'regionsAllowed': 'US,KR,JP'
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <VideoClient
                video={video}
                streamer={streamer}
                relatedVideos={relatedVideos}
            />
        </>
    )
}
