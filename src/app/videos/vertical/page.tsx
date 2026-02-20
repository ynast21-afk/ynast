import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { Metadata } from 'next'
import { getDatabase } from '@/lib/b2'
import { initialVideos, Video } from '@/data/initialData'
import VerticalVideosClient from './VerticalVideosClient'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'Vertical Videos - kStreamer dance',
    description: 'Browse vertical K-Pop dance videos optimized for mobile viewing. Filter by streamer, VIP status, and sort by latest, popular, or most liked.',
    openGraph: {
        title: 'Vertical Videos - kStreamer dance',
        description: 'Browse vertical K-Pop dance videos on kStreamer dance',
        url: `${BASE_URL}/videos/vertical`,
    },
    alternates: {
        canonical: `${BASE_URL}/videos/vertical`,
    },
}

/**
 * SSR Vertical Videos Page
 * - Server-side data fetching for SEO
 * - Filters only vertical orientation videos
 * - Client interactivity in VerticalVideosClient.tsx
 */
async function getVerticalVideosData(): Promise<Video[]> {
    try {
        const db = await Promise.race([
            getDatabase(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 8000)
            ),
        ])

        if (db && db.videos && Array.isArray(db.videos)) {
            return db.videos.filter((v: Video) => v.orientation === 'vertical')
        }
    } catch (e) {
        console.error('Vertical Videos SSR: DB fetch failed, using initial data:', e)
    }

    return (initialVideos as Video[]).filter(v => v.orientation === 'vertical')
}

async function getAllVideosData(): Promise<Video[]> {
    try {
        const db = await Promise.race([
            getDatabase(),
            new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 8000)
            ),
        ])

        if (db && db.videos && Array.isArray(db.videos)) {
            return db.videos
        }
    } catch (e) {
        // fallback
    }
    return initialVideos as Video[]
}

export default async function VerticalVideosPage() {
    const allVideos = await getAllVideosData()
    const verticalVideos = allVideos.filter(v => v.orientation === 'vertical')

    // Sort by newest for SSR HTML
    const sortedForSeo = [...verticalVideos].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    // Collect unique streamers from all videos for filter
    const streamerNames = Array.from(new Set(allVideos.map(v => v.streamerName).filter(Boolean)))

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 Home</Link>
                        <span>›</span>
                        <Link href="/videos" className="hover:text-accent-primary">Videos</Link>
                        <span>›</span>
                        <span className="text-white">Vertical</span>
                    </nav>

                    {/* Interactive client component */}
                    <VerticalVideosClient ssrVideos={allVideos} streamerNames={streamerNames} />
                </div>
            </main>

            {/* 
                SEO: Hidden crawlable links for Googlebot
                All vertical video links in initial HTML for crawler discovery.
            */}
            <nav aria-label="Vertical videos list" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                <h2>Vertical Videos</h2>
                <ul>
                    {sortedForSeo.map((video) => (
                        <li key={video.id}>
                            <Link href={`/video/${video.id}`}>
                                {video.title} - {video.streamerName} ({video.duration})
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <Footer />
        </div>
    )
}
