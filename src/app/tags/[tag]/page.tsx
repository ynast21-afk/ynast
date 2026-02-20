import { Metadata } from 'next'
import { getDatabase } from '@/lib/b2'
import { initialVideos, initialStreamers } from '@/data/initialData'
import { BreadcrumbSchema, ItemListSchema } from '@/components/JsonLd'
import TagDetailClient from './TagDetailClient'

interface PageProps {
    params: { tag: string }
}

const BASE_URL = 'https://kdance.xyz'

async function getTagData(tag: string) {
    const decodedTag = decodeURIComponent(tag)
    let allVideos = [...initialVideos]
    let allStreamers = [...initialStreamers]

    try {
        const db = await getDatabase()
        if (db) {
            if (db.videos && Array.isArray(db.videos)) {
                const videoMap = new Map<string, any>()
                initialVideos.forEach(v => videoMap.set(v.id, v))
                db.videos.forEach((v: any) => {
                    if (v && v.id) videoMap.set(v.id, v)
                })
                allVideos = Array.from(videoMap.values())
            }
            if (db.streamers && Array.isArray(db.streamers)) {
                const streamerMap = new Map<string, any>()
                initialStreamers.forEach(s => streamerMap.set(s.id, s))
                db.streamers.forEach((s: any) => {
                    if (s && s.id) streamerMap.set(s.id, s)
                })
                allStreamers = Array.from(streamerMap.values())
            }
        }
    } catch {
        // fallback to initial data
    }

    const taggedVideos = allVideos.filter(video =>
        video.tags && video.tags.some((t: string) =>
            t.toLowerCase() === decodedTag.toLowerCase() ||
            t.replace('#', '').toLowerCase() === decodedTag.toLowerCase()
        )
    )

    return { taggedVideos, allStreamers, decodedTag }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { taggedVideos, decodedTag } = await getTagData(params.tag)

    // Collect streamer names for this tag
    const streamerNames = Array.from(new Set(taggedVideos.map(v => v.streamerName || 'Unknown')))

    const description = `#${decodedTag} - ${taggedVideos.length} dance videos. Featuring: ${streamerNames.slice(0, 5).join(', ')}. Watch exclusive ${decodedTag} content on kStreamer dance.`

    const keywords = [
        decodedTag,
        `#${decodedTag}`,
        ...streamerNames.slice(0, 10),
        'kstreamer', 'dance', 'streaming', 'video',
        '댄스 태그', '영상 모음', '스트리머 댄스',
    ]

    // Use first video's thumbnail as OG image
    const ogImage = taggedVideos.length > 0 && taggedVideos[0].thumbnailUrl
        ? taggedVideos[0].thumbnailUrl
        : `${BASE_URL}/og-image.png`

    return {
        title: `#${decodedTag} Videos (${taggedVideos.length}) | kStreamer dance`,
        description,
        keywords,
        openGraph: {
            title: `#${decodedTag} - ${taggedVideos.length} Dance Videos`,
            description,
            url: `${BASE_URL}/tags/${encodeURIComponent(decodedTag)}`,
            siteName: 'kStreamer dance',
            images: [{ url: ogImage, alt: `#${decodedTag} videos on kStreamer dance` }],
            locale: 'ko_KR',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `#${decodedTag} - Dance Videos`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${BASE_URL}/tags/${encodeURIComponent(decodedTag)}`,
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    }
}

export default async function TagDetailPage({ params }: PageProps) {
    const { taggedVideos, allStreamers, decodedTag } = await getTagData(params.tag)

    // ItemList for rich results carousel
    const videoListItems = taggedVideos.slice(0, 30).map((v, index) => ({
        name: v.title || `Video ${index + 1}`,
        url: `${BASE_URL}/video/${v.id}`,
        image: v.thumbnailUrl,
        position: index + 1,
    }))

    return (
        <>
            {/* Breadcrumb for navigation */}
            <BreadcrumbSchema
                items={[
                    { name: 'Home', url: BASE_URL },
                    { name: 'Tags', url: `${BASE_URL}/tags` },
                    { name: `#${decodedTag}`, url: `${BASE_URL}/tags/${encodeURIComponent(decodedTag)}` },
                ]}
            />

            {/* ItemList for video carousel in search */}
            {videoListItems.length > 0 && (
                <ItemListSchema
                    name={`#${decodedTag} Videos`}
                    description={`Dance videos tagged with #${decodedTag} on kStreamer dance`}
                    url={`${BASE_URL}/tags/${encodeURIComponent(decodedTag)}`}
                    items={videoListItems}
                />
            )}

            <TagDetailClient
                tag={decodedTag}
                initialVideos={taggedVideos}
                initialStreamers={allStreamers}
            />
        </>
    )
}
