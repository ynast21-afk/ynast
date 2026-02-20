'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useTranslations } from 'next-intl'

export default function TopBanner() {
    const { settings } = useSiteSettings()
    const { banner } = settings
    const [isDismissed, setIsDismissed] = useState(false)
    const t = useTranslations('common')

    useEffect(() => {
        // 세션 스토리지에서 배너 닫힘 상태 확인
        const dismissed = sessionStorage.getItem('kstreamer_banner_dismissed')
        if (dismissed) setIsDismissed(true)
    }, [])

    const handleDismiss = () => {
        setIsDismissed(true)
        sessionStorage.setItem('kstreamer_banner_dismissed', 'true')
    }

    if (!banner.enabled || isDismissed) return null

    return (
        <div
            className="w-full py-3 px-4 flex items-center justify-center gap-4 relative"
            style={{ backgroundColor: banner.backgroundColor, color: banner.textColor }}
        >
            <span className="text-sm font-medium text-center">
                {banner.message}
            </span>
            {banner.linkText && banner.linkUrl && (
                <Link
                    href={banner.linkUrl}
                    className="text-sm font-bold underline hover:no-underline"
                    style={{ color: banner.textColor }}
                >
                    {banner.linkText} →
                </Link>
            )}
            {banner.dismissible && (
                <button
                    onClick={handleDismiss}
                    className="absolute right-4 hover:opacity-70 transition-opacity"
                    style={{ color: banner.textColor }}
                >
                    ✕
                </button>
            )}
        </div>
    )
}
