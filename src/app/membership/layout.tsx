import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: 'VIP Membership',
    description: 'Unlock premium K-Pop dance content with VIP access. Plans starting at $9.99/month. HD streaming, exclusive content, and unlimited downloads.',
    keywords: ['VIP membership', 'premium dance videos', 'kstreamer subscription', 'K-Pop dance', 'exclusive content'],
    openGraph: {
        title: 'VIP Membership - kStreamer dance',
        description: 'Unlock premium K-Pop dance content. Plans from $9.99/month. HD streaming, exclusive choreography, and unlimited access.',
        type: 'website',
        url: `${BASE_URL}/membership`,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'VIP Membership - kStreamer dance',
        description: 'Unlock premium K-Pop dance content. Plans from $9.99/month.',
    },
    alternates: {
        canonical: `${BASE_URL}/membership`,
    },
}

// FAQPage JSON-LD structured data for rich snippets
const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I cancel my subscription?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'You can cancel anytime from your PayPal, Paddle, or Gumroad account. Your access continues until the end of your billing period.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can I change my plan?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! You can upgrade or downgrade anytime through your subscription settings.',
            },
        },
        {
            '@type': 'Question',
            name: 'What payment methods do you accept?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'We accept PayPal subscriptions, credit/debit cards via Paddle, and Gumroad payments worldwide.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is there a free trial?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'New members get access to 10 free videos. VIP includes full access to all premium content.',
            },
        },
    ],
}

export default function MembershipLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {children}
        </>
    )
}
