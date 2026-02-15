import { getDatabase } from '@/lib/b2'
import { initialVideos, initialStreamers } from '@/data/initialData'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = 'https://kdance.xyz'

/**
 * Unified Sitemap (sitemap2.xml)
 * Combines: URL sitemap + Image sitemap + Video sitemap
 * - All static pages (home, videos, actors, tags, etc.)
 * - Dynamic video pages with <image:image> + <video:video>
 * - Dynamic streamer pages with <image:image>
 * - Dynamic tag pages
 *
 * References:
 * - https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 * - https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
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
        console.error('Sitemap: DB fetch failed, using initial data:', e)
    }

    // Collect all unique tags from videos
    const allTags = new Set<string>()
    allVideos.forEach((video) => {
        if (video.tags && Array.isArray(video.tags)) {
            video.tags.forEach((tag: string) => {
                const cleanTag = tag.trim().replace(/^#/, '')
                if (cleanTag) allTags.add(cleanTag)
            })
        }
    })

    const now = new Date().toISOString()

    // Build combined sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`

    // ============================================================
    // SECTION 1: Static Pages
    // ============================================================
    const staticPages = [
        { loc: BASE_URL, priority: '1.0', changefreq: 'daily' },
        { loc: `${BASE_URL}/videos`, priority: '0.95', changefreq: 'daily' },
        { loc: `${BASE_URL}/actors`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/tags`, priority: '0.85', changefreq: 'daily' },
        { loc: `${BASE_URL}/membership`, priority: '0.8', changefreq: 'weekly' },
        { loc: `${BASE_URL}/contact`, priority: '0.5', changefreq: 'monthly' },
        { loc: `${BASE_URL}/docs/terms`, priority: '0.3', changefreq: 'monthly' },
        { loc: `${BASE_URL}/docs/refund`, priority: '0.3', changefreq: 'monthly' },
        { loc: `${BASE_URL}/dmca`, priority: '0.3', changefreq: 'monthly' },
    ]

    for (const page of staticPages) {
        xml += `
  <url>
    <loc>${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    }

    // ============================================================
    // SECTION 2: Streamer Profile Pages (with images)
    // ============================================================
    for (const streamer of allStreamers) {
        const streamerId = encodeURIComponent(String(streamer.id || ''))
        const name = streamer.name || streamer.id || ''
        const koreanName = streamer.koreanName || ''
        const displayName = koreanName ? `${name} (${koreanName})` : name
        const streamerVideos = allVideos.filter(v => v.streamerId === streamer.id)

        xml += `
  <url>
    <loc>${BASE_URL}/actors/${streamerId}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>`

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

        // Video thumbnails for this streamer (max 10)
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

    // ============================================================
    // SECTION 3: Individual Video Pages (with images + video)
    // ============================================================
    for (const video of allVideos) {
        const videoId = encodeURIComponent(String(video.id || ''))
        const streamer = allStreamers.find(s => s.id === video.streamerId)
        const streamerName = streamer?.name || video.streamerName || ''
        const koreanName = streamer?.koreanName || ''
        const displayName = koreanName ? `${streamerName} (${koreanName})` : streamerName
        const tags = video.tags || []
        const tagString = tags.map((t: string) => t.replace('#', '')).join(', ')

        const lastmod = video.createdAt || video.uploadedAt || now

        xml += `
  <url>
    <loc>${BASE_URL}/video/${videoId}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`

        // Image: thumbnail
        if (video.thumbnailUrl) {
            const thumbUrl = video.thumbnailUrl.startsWith('http')
                ? video.thumbnailUrl
                : `${BASE_URL}${video.thumbnailUrl}`
            xml += `
    <image:image>
      <image:loc>${escapeXml(thumbUrl)}</image:loc>
      <image:title>${escapeXml(video.title || '')} - ${escapeXml(streamerName)} dance video</image:title>
      <image:caption>${escapeXml(displayName)} - ${escapeXml(video.title || '')} on kStreamer dance</image:caption>
    </image:image>`
        }

        // Video: structured video sitemap entry
        // Only include for videos that have a thumbnail (Google requires it)
        if (video.thumbnailUrl) {
            const thumbUrl = video.thumbnailUrl.startsWith('http')
                ? video.thumbnailUrl
                : `${BASE_URL}${video.thumbnailUrl}`

            // Convert duration "7:42" → seconds
            let durationSeconds = 300 // default 5 min
            if (video.duration && video.duration.includes(':')) {
                const parts = video.duration.split(':')
                if (parts.length === 2) {
                    durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1])
                } else if (parts.length === 3) {
                    durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
                }
            }

            const description = `${displayName} - ${video.title || 'Dance video'}. ${video.duration || ''} dance performance.${tagString ? ` Tags: ${tagString}` : ''}`

            xml += `
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title || 'Dance Video')}</video:title>
      <video:description>${escapeXml(description)}</video:description>
      <video:player_loc>${escapeXml(`${BASE_URL}/video/${videoId}`)}</video:player_loc>
      <video:duration>${durationSeconds}</video:duration>
      <video:publication_date>${video.createdAt || now}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>${video.views !== undefined ? `
      <video:view_count>${video.views}</video:view_count>` : ''}${tagString ? `
      <video:tag>${escapeXml(tagString)}</video:tag>` : ''}
    </video:video>`
        }

        xml += `
  </url>`
    }

    // ============================================================
    // SECTION 4: Tag Pages
    // ============================================================
    for (const tag of Array.from(allTags)) {
        xml += `
  <url>
    <loc>${BASE_URL}/tags/${encodeURIComponent(tag)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
