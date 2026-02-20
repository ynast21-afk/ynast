import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { getDatabase } from '@/lib/b2'
import { initialVideos, initialStreamers, Video, Streamer } from '@/data/initialData'
import HomeClient from './HomeClient'

const BASE_URL = 'https://kdance.xyz'

/**
 * SSR Home Page
 * - Server-side data fetching for SEO (video links in initial HTML)
 * - Client interactivity (filter, sort, load more) in HomeClient.tsx
 */
async function getHomeData(): Promise<{ videos: Video[]; streamers: Streamer[] }> {
    try {
        const db = await Promise.race([
            getDatabase(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 8000)
            ),
        ])

        if (db && db.videos && db.streamers) {
            return {
                videos: db.videos,
                streamers: db.streamers,
            }
        }
    } catch (e) {
        console.error('Home SSR: DB fetch failed, using initial data:', e)
    }

    return {
        videos: initialVideos as Video[],
        streamers: initialStreamers as Streamer[],
    }
}

export default async function HomePage() {
    const { videos, streamers } = await getHomeData()

    // Sort by newest for SSR HTML (crawlable links)
    const sortedForSeo = [...videos].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    return (
        <div className="min-h-screen">
            <Header />

            {/* Interactive client component (hero, filters, video grid) */}
            <HomeClient ssrVideos={videos} ssrStreamers={streamers} />

            {/* 
                SEO: Hidden crawlable links for Googlebot
                These <a> tags appear in the initial HTML so crawlers can discover
                all video pages even without JavaScript execution.
                Visually hidden but accessible to search engines.
            */}
            <nav aria-label="All videos" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                <h2>All Videos</h2>
                <ul>
                    {sortedForSeo.map((video) => (
                        <li key={video.id}>
                            <Link href={`/video/${video.id}`}>
                                {video.title} - {video.streamerName}
                            </Link>
                        </li>
                    ))}
                </ul>
                <h2>All Creators</h2>
                <ul>
                    {streamers.map((streamer) => (
                        <li key={streamer.id}>
                            <Link href={`/actors/${streamer.id}`}>
                                {streamer.name}{streamer.koreanName ? ` (${streamer.koreanName})` : ''}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <Footer />
        </div>
    )
}
