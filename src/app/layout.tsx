import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'StreamVault - Premium Video Platform',
    description: 'Discover the best premium video content. Your destination for exclusive streams and downloads.',
    keywords: 'streaming, videos, membership, premium content',
    openGraph: {
        title: 'StreamVault',
        description: 'Premium Video Platform',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko" className="dark">
            <body className="bg-bg-primary text-text-primary min-h-screen">
                {children}
            </body>
        </html>
    )
}
