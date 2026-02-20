import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'Explore Tags',
    description: 'Browse K-Pop dance videos by popular tags and categories. Discover choreography, dance covers, and performances by topic on kStreamer dance.',
    keywords: ['K-Pop dance tags', 'dance categories', 'choreography topics', 'dance video tags', 'kstreamer tags'],
    openGraph: {
        title: 'Explore Tags - kStreamer dance',
        description: 'Browse K-Pop dance videos by popular tags and categories.',
        type: 'website',
        url: `${BASE_URL}/tags`,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Explore Tags - kStreamer dance',
        description: 'Browse K-Pop dance videos by popular tags and categories.',
    },
    alternates: {
        canonical: `${BASE_URL}/tags`,
    },
}

export default function TagsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
