import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { StreamerProvider } from '@/contexts/StreamerContext'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext'
import { WebSiteSchema, OrganizationSchema } from '@/components/JsonLd'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import PageTracker from '@/components/PageTracker'
import Script from 'next/script'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kdance.xyz'

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#00FF88',
}

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: 'kStreamer dance - Premium K-Pop Dance Video Platform',
        template: '%s | kStreamer dance',
    },
    description: 'Discover the best premium K-Pop dance video content. Exclusive choreography tutorials, dance covers, and behind-the-scenes from top creators. 한국 최고의 댄스 스트리밍 플랫폼.',
    keywords: ['kpop dance', 'dance tutorial', 'choreography', 'dance cover', 'premium dance videos', 'streaming', 'K-Pop', 'dance lessons', '댄스', '스트리머', 'BJ 댄스', '케이팝', '안무', '커버댄스', '한국 스트리머', '댄스 영상', '케이팝 댄스'],
    authors: [{ name: 'kStreamer Team' }],
    creator: 'kStreamer',
    publisher: 'kStreamer',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: BASE_URL,
        siteName: 'kStreamer dance',
        title: 'kStreamer dance - Premium K-Pop Dance Video Platform',
        description: 'Exclusive K-Pop dance content from top creators worldwide',
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'kStreamer dance - Premium Dance Platform' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'kStreamer dance - Premium K-Pop Dance Platform',
        description: 'Exclusive K-Pop dance content from top creators worldwide',
        images: ['/opengraph-image'],
        creator: '@kstreamer',
    },
    alternates: {
        canonical: BASE_URL,
        languages: {
            'ko': BASE_URL,
            'en': `${BASE_URL}/en`,
            'x-default': BASE_URL,
        },
    },

    verification: {
        google: 'PGHas2jC0El3qCIlvDw2pNXSxILX2fB0rjAmcg36AWg',
    },
}

import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { ThemeContextProvider } from '@/components/ThemeContextProvider'

export const dynamic = 'force-dynamic'

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const locale = await getLocale()
    const messages = await getMessages()

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <WebSiteSchema
                    name="kStreamer dance"
                    url={BASE_URL}
                    description="Premium K-Pop Dance Video Platform"
                />
                <OrganizationSchema
                    name="kStreamer"
                    url={BASE_URL}
                />
                <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
            </head>
            <body className="bg-bg-primary text-text-primary min-h-screen transition-colors duration-300" suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeContextProvider>
                        <SiteSettingsProvider>
                            <GoogleAnalytics />
                            <AuthProvider>
                                <PageTracker />
                                <StreamerProvider>
                                    {children}
                                </StreamerProvider>
                            </AuthProvider>
                        </SiteSettingsProvider>
                    </ThemeContextProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
