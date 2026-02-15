import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: '이용약관 (Terms of Service)',
    description: 'kStreamer dance 서비스 이용약관. 서비스 이용조건, 사용자 권리와 의무, 구독 및 결제 관련 규정을 안내합니다.',
    keywords: ['이용약관', 'terms of service', 'kstreamer 약관', '서비스 이용 조건'],
    openGraph: {
        title: '이용약관 - kStreamer dance',
        description: 'kStreamer dance 서비스 이용약관 안내',
        type: 'website',
        url: `${BASE_URL}/docs/terms`,
    },
    alternates: {
        canonical: `${BASE_URL}/docs/terms`,
    },
}

export default function TermsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
