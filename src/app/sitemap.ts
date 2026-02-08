import { MetadataRoute } from 'next'
import { initialVideos } from '@/data/initialData'
import { getDatabase } from '@/lib/b2'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = 'https://kdance.xyz'

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
        // Use a shorter timeout or more robust abort pattern if needed.
        // For now, ensuring we don't block the crawler forever.
        const db = await getDatabase()
        if (db && db.videos && Array.isArray(db.videos)) {
            const videoMap = new Map<string, any>()
            initialVideos.forEach(v => videoMap.set(v.id, v))
            db.videos.forEach((v: any) => {
                if (v && v.id) videoMap.set(v.id, v)
            })
            allVideos = Array.from(videoMap.values())
        }
    } catch (e) {
        console.error('Sitemap B2 fetch failed, proceeding with initial data:', e)
    }

    // 3. Generate Dynamic URLs (with XML-safe encoding)
    const videoPages = allVideos.map((video) => {
        // Ensure ID is URL safe and non-null
        const videoId = encodeURIComponent(String(video.id || ''))
        return {
            url: `${BASE_URL}/video/${videoId}`,
            lastModified: new Date(video.createdAt || new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }
    })

    return [...staticPages, ...videoPages]
}
