import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Server-side bot detection middleware.
 * Detects crawler visits via User-Agent header and logs them
 * by calling /api/track internally.
 *
 * This solves the problem where client-side PageTracker.tsx
 * can't detect bots that don't execute JavaScript.
 */

// Known bot user agent patterns (same list as /api/track for consistency)
const BOT_PATTERNS = [
    'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'duckduckbot',
    'slurp', 'facebot', 'ia_archiver', 'semrushbot', 'ahrefsbot',
    'mj12bot', 'dotbot', 'petalbot', 'sogou', 'bytespider',
    'applebot', 'twitterbot', 'linkedinbot', 'discordbot',
    'telegrambot', 'whatsapp', 'kakaotalk', 'naverbot', 'yeti',
    'crawler', 'spider', 'bot/', 'bot;', 'headlesschrome',
    'gptbot', 'claudebot', 'anthropic', 'ccbot',
]

function isBot(ua: string): boolean {
    const lower = ua.toLowerCase()
    return BOT_PATTERNS.some(pattern => lower.includes(pattern))
}

export function middleware(request: NextRequest) {
    const ua = request.headers.get('user-agent') || ''

    // Only process if it's a bot
    if (!isBot(ua)) {
        return NextResponse.next()
    }

    const pathname = request.nextUrl.pathname

    // Skip static files, API routes, admin pages, and Next.js internals
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon') ||
        pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp|mp4|webm)$/)
    ) {
        return NextResponse.next()
    }

    // Fire-and-forget: send bot visit to /api/track
    // We build the full URL for the internal fetch
    const trackUrl = new URL('/api/track', request.url)

    try {
        fetch(trackUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': ua,
                // Mark this as coming from middleware (for dedup in track API)
                'x-bot-source': 'middleware',
                // Forward geo headers for country detection
                ...(request.headers.get('x-vercel-ip-country')
                    ? { 'x-vercel-ip-country': request.headers.get('x-vercel-ip-country')! }
                    : {}),
                ...(request.headers.get('cf-ipcountry')
                    ? { 'cf-ipcountry': request.headers.get('cf-ipcountry')! }
                    : {}),
            },
            body: JSON.stringify({
                page: pathname,
                referrer: request.headers.get('referer') || 'direct',
            }),
        }).catch(() => {
            // Silent fail — middleware tracking should never break anything
        })
    } catch {
        // Silent fail
    }

    return NextResponse.next()
}

// Only run middleware on page routes (not static files or API)
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|mp4|webm)).*)',
    ],
}
