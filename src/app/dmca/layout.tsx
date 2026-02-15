import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'DMCA Policy',
    description: 'Digital Millennium Copyright Act (DMCA) policy for kStreamer dance. Learn how to report copyright infringement and file takedown notices.',
    keywords: ['DMCA policy', 'copyright notice', 'takedown request', 'kstreamer DMCA'],
    openGraph: {
        title: 'DMCA Policy - kStreamer dance',
        description: 'DMCA copyright infringement reporting policy for kStreamer dance.',
        type: 'website',
        url: `${BASE_URL}/dmca`,
    },
    alternates: {
        canonical: `${BASE_URL}/dmca`,
    },
}

export default function DMCALayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
