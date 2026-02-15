import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { Metadata } from 'next'
import { getDatabase } from '@/lib/b2'
import { initialVideos, Video } from '@/data/initialData'
import VideosClient from './VideosClient'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'All Videos - kStreamer dance',
    description: 'Browse all K-Pop dance videos. Filter by free or VIP, sort by latest, popular, or most liked. Premium dance content from top creators.',
    openGraph: {
        title: 'All Videos - kStreamer dance',
        description: 'Browse all K-Pop dance videos on kStreamer dance',
        url: `${BASE_URL}/videos`,
    },
    alternates: {
        canonical: `${BASE_URL}/videos`,
    },
}

/**
 * SSR Videos Page
 * - Server-side data fetching for SEO (video links in initial HTML)
 * - Client interactivity (filter, sort, pagination) in VideosClient.tsx
 */
async function getVideosData(): Promise<Video[]> {
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
        console.error('Videos SSR: DB fetch failed, using initial data:', e)
    }

    return initialVideos as Video[]
}

export default async function VideosPage() {
    const videos = await getVideosData()

    // Sort by newest for SSR HTML
    const sortedForSeo = [...videos].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-[1800px] mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                        <Link href="/" className="hover:text-accent-primary">🏠 Home</Link>
                        <span>›</span>
                        <span className="text-white">Videos</span>
                    </nav>

                    {/* Interactive client component */}
                    <VideosClient ssrVideos={videos} />
                </div>
            </main>

            {/* 
                SEO: Hidden crawlable links for Googlebot
                All video links in initial HTML for crawler discovery.
            */}
            <nav aria-label="All videos list" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                <h2>All Videos</h2>
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
