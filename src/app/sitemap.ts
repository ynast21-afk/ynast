import { MetadataRoute } from 'next'

const BASE_URL = process.env.NODE_ENV === 'production' ? 'https://kdance.xyz' : (process.env.NEXT_PUBLIC_BASE_URL || 'https://kdance.xyz')

export default function sitemap(): MetadataRoute.Sitemap {
    // 정적 페이지들
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

    // TODO: 향후 DB에서 비디오 목록 가져와서 동적 URL 생성
    // const videos = await getVideos()
    // const videoPages = videos.map((video) => ({
    //     url: `${BASE_URL}/video/${video.id}`,
    //     lastModified: video.updatedAt,
    //     changeFrequency: 'weekly' as const,
    //     priority: 0.8,
    // }))

    return [...staticPages]
}
