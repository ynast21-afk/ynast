import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'Contact Us',
    description: 'Get in touch with the kStreamer dance team. Send us questions about membership, payments, technical issues, or general inquiries.',
    keywords: ['contact kstreamer', 'kstreamer support', 'customer service', 'help'],
    openGraph: {
        title: 'Contact Us - kStreamer dance',
        description: 'Get in touch with the kStreamer dance team for support and inquiries.',
        type: 'website',
        url: `${BASE_URL}/contact`,
    },
    alternates: {
        canonical: `${BASE_URL}/contact`,
    },
}

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
