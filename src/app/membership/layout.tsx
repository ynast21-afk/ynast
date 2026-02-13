import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'VIP Membership',
    description: 'Unlock premium K-Pop dance content with VIP access. Plans starting at $9.99/month. HD streaming, exclusive content, and unlimited downloads.',
    openGraph: {
        title: 'VIP Membership - kStreamer dance',
        description: 'Unlock premium K-Pop dance content. Plans from $9.99/month',
        type: 'website',
    },
}

export default function MembershipLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
