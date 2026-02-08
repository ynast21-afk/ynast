import { MetadataRoute } from 'next'
import { initialVideos } from '@/data/initialData'
import { getDatabase } from '@/lib/b2'

const BASE_URL = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : (process.env.NEXT_PUBLIC_BASE_URL || 'https://kdance.xyz')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static Pages
    const staticPages = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${BASE_URL}/membership`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/videos`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/actors`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
    ]

    // 2. Fetch Dynamic Data from B2
    let allVideos = [...initialVideos]
    try {
        const db = await getDatabase()
        if (db && db.videos && Array.isArray(db.videos)) {
            // Merge videos: B2 videos take precedence or append
            // For sitemap, we just want a unique list of all effective video IDs.
            // If B2 has everything (including initials), we should prefer B2.
            // But if B2 is empty, fallback to initial.
            // Strategy: Use a Map to dedup by ID.
            const videoMap = new Map<string, any>()

            // Add initial videos first
            initialVideos.forEach(v => videoMap.set(v.id, v))

            // Add/Overwrite with B2 videos
            db.videos.forEach((v: any) => videoMap.set(v.id, v))

            allVideos = Array.from(videoMap.values())
        }
    } catch (e) {
        console.error('Sitemap failed to fetch B2 DB, using initial data', e)
    }

    // 3. Generate Dynamic URLs
    const videoPages = allVideos.map((video) => ({
        url: `${BASE_URL}/video/${video.id}`,
        lastModified: new Date(video.createdAt || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [...staticPages, ...videoPages]
}
