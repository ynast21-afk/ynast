'use client'

import { useEffect, Suspense } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

declare global {
    interface Window {
        gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void
        dataLayer: unknown[]
    }
}

function GoogleAnalyticsInner() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { settings } = useSiteSettings()
    const { analytics } = settings

    // 환경변수 또는 관리자 설정의 ID 사용
    const gaId = analytics?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_ID
    const isEnabled = analytics?.enabled ?? true

    useEffect(() => {
        if (pathname && gaId && isEnabled) {
            const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

            if (typeof window.gtag === 'function') {
                window.gtag('config', gaId, {
                    page_path: url,
                })
            }
        }
    }, [pathname, searchParams, gaId, isEnabled])

    if (!gaId || !isEnabled) return null

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${gaId}', {
                            page_path: window.location.pathname,
                        });
                    `,
                }}
            />
        </>
    )
}

export default function GoogleAnalytics() {
    return (
        <Suspense fallback={null}>
            <GoogleAnalyticsInner />
        </Suspense>
    )
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
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        })
    }
}
