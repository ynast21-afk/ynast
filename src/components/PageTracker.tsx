'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Lightweight page view tracker.
 * Uses navigator.sendBeacon() for zero performance impact.
 * Tracks: page path, referrer, timestamp.
 * Data is sent to /api/track and stored in B2.
 */
export default function PageTracker() {
    const pathname = usePathname()
    const lastTracked = useRef<string>('')

    useEffect(() => {
        // Avoid duplicate tracking for the same path
        if (!pathname || pathname === lastTracked.current) return
        lastTracked.current = pathname

        // Don't track admin pages
        if (pathname.startsWith('/admin')) return

        // Don't track API routes
        if (pathname.startsWith('/api')) return

        const payload = JSON.stringify({
            page: pathname,
            referrer: document.referrer || 'direct',
        })

        // Use sendBeacon for non-blocking, fire-and-forget tracking
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
        } else {
            // Fallback for older browsers
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
            }).catch(() => {
                // Silent fail — tracking should never break the site
            })
        }
    }, [pathname])

    return null // Invisible component
}
