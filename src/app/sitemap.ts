import { MetadataRoute } from 'next'
import { initialVideos, initialStreamers } from '@/data/initialData'
import { getDatabase } from '@/lib/b2'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = 'https://kdance.xyz'

/**
 * Fetch database with timeout to prevent sitemap generation failure.
 * If B2 is slow or unreachable, falls back to initial data gracefully.
 */
async function getSafeDatabase(timeoutMs = 8000) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        const db = await Promise.race([
            getDatabase(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Database fetch timeout')), timeoutMs)
            ),
        ])

        clearTimeout(timeoutId)
        return db
    } catch (e) {
        console.error('Sitemap: Database fetch failed/timed out, using initial data:', e)
        return null
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static Pages - always included
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${BASE_URL}/videos`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${BASE_URL}/actors`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/tags`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${BASE_URL}/membership`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/docs/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/docs/refund`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/dmca`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ]

    // 2. Fetch Dynamic Data (with timeout fallback)
    let allVideos = [...initialVideos]
    let allStreamers = [...initialStreamers]

    const db = await getSafeDatabase()
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

    // 3. Video pages
    const videoPages: MetadataRoute.Sitemap = allVideos.map((video) => {
        const videoId = encodeURIComponent(String(video.id || ''))
        return {
            url: `${BASE_URL}/video/${videoId}`,
            lastModified: new Date(video.createdAt || video.uploadedAt || new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }
    })

    // 4. Streamer/Actor profile pages
    const streamerPages: MetadataRoute.Sitemap = allStreamers.map((streamer) => {
        const streamerId = encodeURIComponent(String(streamer.id || ''))
        return {
            url: `${BASE_URL}/actors/${streamerId}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
        }
    })

    // 5. Tag pages
    const allTags = new Set<string>()
    allVideos.forEach((video) => {
        if (video.tags && Array.isArray(video.tags)) {
            video.tags.forEach((tag: string) => {
                const cleanTag = tag.trim().replace(/^#/, '')
                if (cleanTag) allTags.add(cleanTag)
            })
        }
    })

    const tagPages: MetadataRoute.Sitemap = Array.from(allTags).map((tag) => ({
        url: `${BASE_URL}/tags/${encodeURIComponent(tag)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }))

    return [...staticPages, ...videoPages, ...streamerPages, ...tagPages]
}
