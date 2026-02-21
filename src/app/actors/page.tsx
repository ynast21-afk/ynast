import { Metadata } from 'next'
import { getDatabase } from '@/lib/b2'
import { initialStreamers } from '@/data/initialData'
import ActorsClient from './ActorsClient'
import { BreadcrumbSchema, ItemListSchema } from '@/components/JsonLd'

const BASE_URL = 'https://kdance.xyz'

async function getActorsData() {
    try {
        const db = await getDatabase()
        if (db && db.streamers && Array.isArray(db.streamers)) {
            // B2 data available — use B2 streamers only, no demo merge
            const validStreamers = db.streamers.filter((s: any) => s && s.id)

            // 미분류 스트리머 자동 주입
            if (!validStreamers.find((s: any) => s.id === 'uncategorized')) {
                validStreamers.push({
                    id: 'uncategorized',
                    name: 'uncategorized',
                    koreanName: '미분류',
                    gradient: 'from-gray-800 to-gray-900',
                    videoCount: 0,
                    followers: 0,
                    createdAt: new Date().toISOString().split('T')[0],
                })
            }

            return {
                streamers: validStreamers,
                downloadToken: db.downloadToken || null,
                downloadUrl: db.downloadUrl || null,
                activeBucketName: db.activeBucketName || null,
            }
        }
    } catch (e) {
        console.error('Actors page: DB fetch failed', e)
    }
    // Fallback only if B2 is completely unavailable
    return {
        streamers: [...initialStreamers],
        downloadToken: null,
        downloadUrl: null,
        activeBucketName: null,
    }
}

export async function generateMetadata(): Promise<Metadata> {
    const { streamers } = await getActorsData()

    // Build list of top streamer names for meta description
    const topStreamers = streamers
        .sort((a: any, b: any) => (b.videoCount || 0) - (a.videoCount || 0))
        .slice(0, 15)
    const nameList = topStreamers
        .map((s: any) => `${s.name}${s.koreanName ? ` (${s.koreanName})` : ''}`)
        .join(', ')

    const description = `Browse ${streamers.length} dance content creators on kStreamer dance. Featured: ${nameList}. Watch exclusive dance videos and performances.`

    // All streamer names + korean names as keywords
    const keywords: string[] = []
    streamers.forEach((s: any) => {
        if (s.name) keywords.push(s.name)
        if (s.koreanName) keywords.push(s.koreanName)
    })
    keywords.push('kstreamer', 'dance', 'streamer', 'dancer', 'twitch', 'content creator')

    return {
        title: 'All Creators | kStreamer dance - Dance Video Platform',
        description,
        keywords: keywords.slice(0, 50),
        openGraph: {
            title: `All ${streamers.length} Creators - kStreamer dance`,
            description,
            url: `${BASE_URL}/actors`,
            siteName: 'kStreamer dance',
            type: 'website',
            locale: 'ko_KR',
            images: [
                {
                    url: `${BASE_URL}/og-image.png`,
                    width: 1200,
                    height: 630,
                    alt: 'kStreamer dance - All Creators',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `All ${streamers.length} Creators - kStreamer dance`,
            description,
        },
        alternates: {
            canonical: `${BASE_URL}/actors`,
        },
        robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    }
}

export default async function ActorsPage() {
    const { streamers, downloadToken, downloadUrl, activeBucketName } = await getActorsData()

    // Build items for ItemList schema (enables carousel in search)
    const listItems = streamers
        .sort((a: any, b: any) => (b.videoCount || 0) - (a.videoCount || 0))
        .slice(0, 30)
        .map((s: any, index: number) => ({
            name: `${s.name}${s.koreanName ? ` (${s.koreanName})` : ''}`,
            url: `${BASE_URL}/actors/${s.id}`,
            image: s.profileImage || undefined,
            position: index + 1,
        }))

    return (
        <>
            {/* Breadcrumb for site hierarchy */}
            <BreadcrumbSchema
                items={[
                    { name: 'Home', url: BASE_URL },
                    { name: 'Creators', url: `${BASE_URL}/actors` },
                ]}
            />

            {/* ItemList schema for carousel rich results */}
            <ItemListSchema
                name="kStreamer dance Creators"
                description={`All ${streamers.length} dance content creators on kStreamer dance platform`}
                url={`${BASE_URL}/actors`}
                items={listItems}
            />

            <ActorsClient
                streamers={streamers}
                downloadToken={downloadToken}
                downloadUrl={downloadUrl}
                activeBucketName={activeBucketName}
            />
        </>
    )
}
