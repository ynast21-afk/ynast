import type { Metadata } from 'next'

const BASE_URL = 'https://kdance.xyz'

export const metadata: Metadata = {
    title: '환불 정책 (Refund Policy)',
    description: 'kStreamer dance 환불 정책. 디지털 콘텐츠 특성에 따른 환불 규정, 정기 구독 해지 방법, 환불 예외 사항을 안내합니다.',
    keywords: ['환불 정책', 'refund policy', 'kstreamer 환불', '구독 해지'],
    openGraph: {
        title: '환불 정책 - kStreamer dance',
        description: 'kStreamer dance 환불 정책 안내',
        type: 'website',
        url: `${BASE_URL}/docs/refund`,
    },
    alternates: {
        canonical: `${BASE_URL}/docs/refund`,
    },
}

export default function RefundLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
