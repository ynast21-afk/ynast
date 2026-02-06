'use client'

import Script from 'next/script'

// Google Analytics 측정 ID - 환경변수로 관리
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || ''

export default function GoogleAnalytics() {
    if (!GA_TRACKING_ID) return null

    return (
        <>
            {/* Google Analytics Script */}
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_TRACKING_ID}', {
                            page_path: window.location.pathname,
                        });
                    `,
                }}
            />
        </>
    )
}

// 페이지뷰 추적 함수 (SPA 네비게이션용)
export const pageview = (url: string) => {
    if (typeof window !== 'undefined' && GA_TRACKING_ID) {
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        })
    }
}

// 이벤트 추적 함수
export const event = ({
    action,
    category,
    label,
    value,
}: {
    action: string
    category: string
    label?: string
    value?: number
}) => {
    if (typeof window !== 'undefined' && GA_TRACKING_ID) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        })
    }
}

// TypeScript 타입 선언
declare global {
    interface Window {
        gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void
    }
}
