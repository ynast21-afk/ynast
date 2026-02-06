import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
    title: 'kStreamer dance - Premium Dance Video Platform',
    description: 'Discover the best premium dance video content. Your destination for exclusive streams and downloads.',
    keywords: 'streaming, dance videos, membership, premium content, kpop dance',
    openGraph: {
        title: 'kStreamer dance',
        description: 'Premium Dance Video Platform',
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
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
