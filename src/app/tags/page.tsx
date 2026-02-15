import { getDatabase } from '@/lib/b2'
import { initialVideos } from '@/data/initialData'
import TagsClient from './TagsClient'

export default async function TagsPage() {
    // Server-side: fetch tags from DB so Googlebot can see them in HTML
    let allVideos = [...initialVideos]

    try {
        const db = await getDatabase()
        if (db && db.videos && Array.isArray(db.videos)) {
            const videoMap = new Map<string, any>()
            initialVideos.forEach(v => videoMap.set(v.id, v))
            db.videos.forEach((v: any) => {
                if (v && v.id) videoMap.set(v.id, v)
            })
            allVideos = Array.from(videoMap.values())
        }
    } catch {
        // fallback to initial data
    }

    // Extract all tags and count occurrences
    const tagCounts: Record<string, number> = {}
    allVideos.forEach(video => {
        if (video.tags && Array.isArray(video.tags)) {
            video.tags.forEach((tag: string) => {
                const normalizedTag = tag.trim().replace(/^#/, '')
                if (normalizedTag) {
                    tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1
                }
            })
        }
    })

    // Convert to sorted array for client
    const initialTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([tag, count]) => ({ tag, count }))

    return <TagsClient initialTags={initialTags} />
}
