import { Metadata } from 'next'
import { getDatabase } from '@/lib/b2'
import { initialStreamers, initialVideos } from '@/data/initialData'
import ActorDetailClient from './ActorDetailClient'
import { PersonSchema, BreadcrumbSchema, ItemListSchema, ImageGallerySchema } from '@/components/JsonLd'

interface PageProps {
    params: { id: string }
}

const BASE_URL = 'https://kdance.xyz'

async function getActorData(id: string) {
    try {
        // 1. Try B2 Database
        const db = await getDatabase()
        if (db && db.streamers) {
            // ID로 먼저 검색, 없으면 이름(name)으로 fallback 검색
            let streamer = db.streamers.find((s: any) => s.id === id)
                || db.streamers.find((s: any) => s.name === id || s.name?.toLowerCase() === id.toLowerCase())

            // 미분류 스트리머 자동 생성 (B2에 없는 경우)
            if (!streamer && id === 'uncategorized') {
                streamer = {
                    id: 'uncategorized',
                    name: 'uncategorized',
                    koreanName: '미분류',
                    gradient: 'from-gray-800 to-gray-900',
                    videoCount: 0,
                    followers: 0,
                    createdAt: new Date().toISOString().split('T')[0],
                }
            }

            if (streamer) {
                // Ensure followers field exists for legacy data
                if (typeof streamer.followers === 'undefined') {
                    streamer.followers = 0
                }
                // 실제 스트리머 ID로 비디오 필터링 (이름 fallback으로 찾았을 때도 정확하게)
                const realId = streamer.id
                const videos = db.videos?.filter((v: any) => v.streamerId === realId) || []
                // 미분류 스트리머의 videoCount 실시간 반영
                if (realId === 'uncategorized') {
                    streamer.videoCount = videos.length
                }
                return { streamer, videos, downloadToken: db.downloadToken || null }
            }
        }

        // 2. Fallback to Initial Data (ID 또는 이름으로 검색)
        const streamer = initialStreamers.find((s) => s.id === id)
            || initialStreamers.find((s) => s.name === id || s.name?.toLowerCase() === id.toLowerCase())
        const realId = streamer?.id || id
        const videos = initialVideos.filter((v) => v.streamerId === realId)
        return { streamer, videos, downloadToken: null }
    } catch (error) {
        console.error(`[getActorData] Error fetching actor data for id='${id}':`, error)
        return { streamer: undefined, videos: [], downloadToken: null }
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { streamer, videos } = await getActorData(params.id)

    if (!streamer) {
        return {
            title: 'Actor Not Found - kStreamer dance',
        }
    }

    const name = streamer.name
    const koreanName = streamer.koreanName || ''
    const videoCount = videos.length || streamer.videoCount || 0

    // Collect all unique tags from this streamer's videos
    const allTags: string[] = []
    videos.forEach((v: any) => {
        if (v.tags && Array.isArray(v.tags)) {
            v.tags.forEach((t: string) => {
                const clean = t.replace('#', '').trim()
                if (clean && !allTags.includes(clean)) allTags.push(clean)
            })
        }
    })

    // Rich description with streamer ID, nickname, tags
    const tagString = allTags.length > 0 ? ` Known for: ${allTags.slice(0, 10).join(', ')}.` : ''
    const description = `${name}${koreanName ? ` (${koreanName})` : ''} - ${videoCount} premium dance videos.${tagString} Watch exclusive content on kStreamer dance.`

    // Keywords: streamer name, korean name, all their tags
    const keywords = [
        name,
        ...(koreanName ? [koreanName] : []),
        ...allTags.slice(0, 20),
        'kstreamer', 'dance', 'streamer', 'dancer',
        '스트리머', '댄서', '프로필', '댄스 영상',
    ]

    const profileImage = streamer.profileImage || `${BASE_URL}/og-image.png`

    return {
        title: `${name}${koreanName ? ` (${koreanName})` : ''} | Creators - kStreamer dance`,
        description,
        keywords,
        openGraph: {
            title: `${name}${koreanName ? ` (${koreanName})` : ''} - kStreamer dance Creator`,
            description,
            url: `${BASE_URL}/actors/${params.id}`,
            siteName: 'kStreamer dance',
            images: [
                {
                    url: profileImage,
                    width: 400,
                    height: 400,
                    alt: `${name} profile picture - kStreamer dance creator`,
                },
            ],
            type: 'profile',
            locale: 'ko_KR',
        },
        twitter: {
            card: 'summary',
            title: `${name}${koreanName ? ` (${koreanName})` : ''}`,
            description,
            images: [profileImage],
            creator: `@${name}`,
        },
        alternates: {
            canonical: `${BASE_URL}/actors/${params.id}`,
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
        other: {
            'profile:username': name,
            ...(koreanName && { 'profile:alternative_name': koreanName }),
        },
    }
}

export default async function ActorPage({ params }: PageProps) {
    const { streamer, videos, downloadToken } = await getActorData(params.id)

    if (!streamer) {
        return <ActorDetailClient streamer={null} videos={[]} downloadToken={null} />
    }

    // Collect all unique tags from this streamer's videos
    const allTags: string[] = []
    videos.forEach((v: any) => {
        if (v.tags && Array.isArray(v.tags)) {
            v.tags.forEach((t: string) => {
                const clean = t.replace('#', '').trim()
                if (clean && !allTags.includes(clean)) allTags.push(clean)
            })
        }
    })

    // Video list items for ItemList schema (enables carousel in search)
    const videoListItems = videos.slice(0, 20).map((v: any, index: number) => ({
        name: v.title || `Video ${index + 1}`,
        url: `${BASE_URL}/video/${v.id}`,
        image: v.thumbnailUrl,
        position: index + 1,
    }))

    return (
        <>
            {/* Person structured data - rich profile in Google */}
            <PersonSchema
                name={streamer.name}
                alternateName={streamer.koreanName || undefined}
                url={`${BASE_URL}/actors/${streamer.id}`}
                image={streamer.profileImage}
                description={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} is a content creator on kStreamer dance with ${videos.length} videos. ${allTags.length > 0 ? `Known for: ${allTags.slice(0, 8).join(', ')}` : ''}`}
                followerCount={streamer.followers}
                videoCount={videos.length}
                tags={allTags}
            />

            {/* Breadcrumb for site hierarchy */}
            <BreadcrumbSchema
                items={[
                    { name: 'Home', url: BASE_URL },
                    { name: 'Creators', url: `${BASE_URL}/actors` },
                    { name: streamer.name, url: `${BASE_URL}/actors/${streamer.id}` },
                ]}
            />

            {/* Video list - enables carousel rich result */}
            {videoListItems.length > 0 && (
                <ItemListSchema
                    name={`${streamer.name}'s Videos`}
                    description={`All dance videos by ${streamer.name} on kStreamer dance`}
                    url={`${BASE_URL}/actors/${streamer.id}`}
                    items={videoListItems}
                />
            )}

            {/* Image Gallery - helps Google Images index all thumbnails for this streamer */}
            {videoListItems.length > 0 && (
                <ImageGallerySchema
                    name={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} - Dance Videos`}
                    description={`${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} dance video gallery on kStreamer dance. ${videos.length} videos. ${allTags.length > 0 ? `Known for: ${allTags.slice(0, 8).join(', ')}` : ''}`}
                    url={`${BASE_URL}/actors/${streamer.id}`}
                    images={videos.slice(0, 20).filter((v: any) => v.thumbnailUrl).map((v: any) => ({
                        url: v.thumbnailUrl.startsWith('http') ? v.thumbnailUrl : `${BASE_URL}${v.thumbnailUrl}`,
                        name: `${v.title || 'Dance video'} - ${streamer.name}`,
                        caption: `${streamer.name}${streamer.koreanName ? ` (${streamer.koreanName})` : ''} - ${v.title || 'dance'} on kStreamer dance`,
                    }))}
                />
            )}

            <ActorDetailClient
                streamer={streamer}
                videos={videos}
                downloadToken={downloadToken}
            />
        </>
    )
}
