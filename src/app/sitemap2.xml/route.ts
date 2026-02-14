import { getDatabase } from '@/lib/b2'
import { initialVideos, initialStreamers } from '@/data/initialData'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = 'https://kdance.xyz'

/**
 * Google Image Sitemap (sitemap2.xml)
 * Helps Google discover and index images from our site.
 * Images associated with streamer profiles and video pages
 * will appear in Google Image Search for streamer ID queries.
 *
 * Reference: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
export async function GET() {
    let allVideos = [...initialVideos]
    let allStreamers = [...initialStreamers]

    try {
        const db = await Promise.race([
            getDatabase(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 8000)
            ),
        ])

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
    } catch (e) {
        console.error('Image Sitemap: DB fetch failed, using initial data:', e)
    }

    // Build image sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`

    // --- Streamer Profile Pages ---
    for (const streamer of allStreamers) {
        const streamerId = encodeURIComponent(String(streamer.id || ''))
        const name = streamer.name || streamer.id || ''
        const koreanName = streamer.koreanName || ''
        const displayName = koreanName ? `${name} (${koreanName})` : name

        // Get this streamer's videos for additional images
        const streamerVideos = allVideos.filter(v => v.streamerId === streamer.id)

        xml += `
  <url>
    <loc>${BASE_URL}/actors/${streamerId}</loc>`

        // Profile image
        if (streamer.profileImage) {
            const profileUrl = streamer.profileImage.startsWith('http')
                ? streamer.profileImage
                : `${BASE_URL}${streamer.profileImage}`
            xml += `
    <image:image>
      <image:loc>${escapeXml(profileUrl)}</image:loc>
      <image:title>${escapeXml(displayName)} - kStreamer dance creator</image:title>
      <image:caption>${escapeXml(displayName)} profile on kStreamer dance - premium dance video platform</image:caption>
    </image:image>`
        }

        // Video thumbnails for this streamer (max 10 per page for sitemap efficiency)
        for (const video of streamerVideos.slice(0, 10)) {
            if (video.thumbnailUrl) {
                const thumbUrl = video.thumbnailUrl.startsWith('http')
                    ? video.thumbnailUrl
                    : `${BASE_URL}${video.thumbnailUrl}`
                xml += `
    <image:image>
      <image:loc>${escapeXml(thumbUrl)}</image:loc>
      <image:title>${escapeXml(video.title || '')} - ${escapeXml(name)} dance</image:title>
      <image:caption>${escapeXml(name)}${koreanName ? ` (${escapeXml(koreanName)})` : ''} dance video - ${escapeXml(video.title || '')}</image:caption>
    </image:image>`
            }
        }

        xml += `
  </url>`
    }

    // --- Individual Video Pages ---
    for (const video of allVideos) {
        if (!video.thumbnailUrl) continue

        const videoId = encodeURIComponent(String(video.id || ''))
        const streamer = allStreamers.find(s => s.id === video.streamerId)
        const streamerName = streamer?.name || video.streamerName || ''
        const koreanName = streamer?.koreanName || ''

        const thumbUrl = video.thumbnailUrl.startsWith('http')
            ? video.thumbnailUrl
            : `${BASE_URL}${video.thumbnailUrl}`

        xml += `
  <url>
    <loc>${BASE_URL}/video/${videoId}</loc>
    <image:image>
      <image:loc>${escapeXml(thumbUrl)}</image:loc>
      <image:title>${escapeXml(video.title || '')} - ${escapeXml(streamerName)} dance video</image:title>
      <image:caption>${escapeXml(streamerName)}${koreanName ? ` (${escapeXml(koreanName)})` : ''} - ${escapeXml(video.title || '')} on kStreamer dance</image:caption>
    </image:image>
  </url>`
    }

    xml += `
</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    })
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}
