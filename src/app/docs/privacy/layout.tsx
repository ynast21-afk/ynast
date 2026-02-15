import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: '개인정보처리방침 (Privacy Policy)',
    description: 'kStreamer dance 개인정보처리방침. 개인정보의 처리 목적, 보유 기간, 정보주체의 권리 및 안전성 확보 조치에 대해 안내합니다.',
    keywords: ['개인정보처리방침', 'privacy policy', 'kstreamer 개인정보', '데이터 보호'],
    openGraph: {
        title: '개인정보처리방침 - kStreamer dance',
        description: 'kStreamer dance 개인정보처리방침 안내',
        type: 'website',
        url: `${BASE_URL}/docs/privacy`,
    },
    alternates: {
        canonical: `${BASE_URL}/docs/privacy`,
    },
}

export default function PrivacyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
