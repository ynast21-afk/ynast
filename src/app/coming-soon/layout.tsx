import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'Coming Soon',
    description: 'This feature is coming soon to kStreamer dance. Stay tuned for exciting new updates!',
    robots: {
        index: false,
        follow: true,
    },
    alternates: {
        canonical: `${BASE_URL}/coming-soon`,
    },
}

export default function ComingSoonLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
