import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Known bot user agent patterns
const BOT_PATTERNS = [
    'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'duckduckbot',
    'slurp', 'facebot', 'ia_archiver', 'semrushbot', 'ahrefsbot',
    'mj12bot', 'dotbot', 'petalbot', 'sogou', 'bytespider',
    'applebot', 'twitterbot', 'linkedinbot', 'discordbot',
    'telegrambot', 'whatsapp', 'kakaotalk', 'naverbot', 'yeti',
    'crawler', 'spider', 'bot/', 'bot;', 'headlesschrome',
]

function isBot(ua: string): string | false {
    const lower = ua.toLowerCase()
    for (const pattern of BOT_PATTERNS) {
        if (lower.includes(pattern)) {
            // Return the bot name
            const match = BOT_PATTERNS.find(p => lower.includes(p))
            return match || 'unknown_bot'
        }
    }
    return false
}

// Extract country from various headers (Vercel, Cloudflare, etc.)
function getCountry(request: NextRequest): string {
    // Vercel provides geo data
    const vercelCountry = request.headers.get('x-vercel-ip-country')
    if (vercelCountry) return vercelCountry

    // Cloudflare
    const cfCountry = request.headers.get('cf-ipcountry')
    if (cfCountry) return cfCountry

    // Generic geo header
    const geoCountry = request.headers.get('x-country')
    if (geoCountry) return geoCountry

    return 'XX' // Unknown
}

function getDateKey(): string {
    return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

interface VisitRecord {
    t: number       // timestamp (epoch seconds)
    p: string       // page path
    r: string       // referrer domain
    rf?: string     // full referrer URL (for detailed analysis)
    c: string       // country code
    b: boolean      // is bot
}

interface BotVisitRecord {
    t: number
    ua: string      // bot name
    p: string       // page path
}

interface DailyAnalytics {
    date: string
    visits: VisitRecord[]
    botVisits: BotVisitRecord[]
    pageViews: Record<string, number>   // path → count
    referrers: Record<string, number>   // referrer domain → count
    countries: Record<string, number>   // country code → count
    hourly: number[]                    // 24-element array [hour0, hour1, ...]
}

function createEmptyDay(date: string): DailyAnalytics {
    return {
        date,
        visits: [],
        botVisits: [],
        pageViews: {},
        referrers: {},
        countries: {},
        hourly: new Array(24).fill(0),
    }
}

function extractReferrerDomain(referrer: string): string {
    if (!referrer || referrer === '' || referrer === 'direct') return 'direct'
    try {
        const url = new URL(referrer)
        return url.hostname.replace('www.', '')
    } catch {
        return referrer.slice(0, 50)
    }
}

// POST: Track a page visit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { page, referrer } = body

        if (!page || typeof page !== 'string') {
            return NextResponse.json({ ok: true }) // Silent fail
        }

        const ua = request.headers.get('user-agent') || ''
        const country = getCountry(request)
        const dateKey = getDateKey()
        const now = Math.floor(Date.now() / 1000)
        const hour = new Date().getUTCHours()

        const filePath = `data/analytics/${dateKey}.json`

        // Load or create daily data
        let dayData: DailyAnalytics
        try {
            const existing = await getJsonFile(filePath)
            dayData = existing || createEmptyDay(dateKey)
        } catch {
            dayData = createEmptyDay(dateKey)
        }

        // Ensure arrays/objects exist (migration safety)
        if (!dayData.visits) dayData.visits = []
        if (!dayData.botVisits) dayData.botVisits = []
        if (!dayData.pageViews) dayData.pageViews = {}
        if (!dayData.referrers) dayData.referrers = {}
        if (!dayData.countries) dayData.countries = {}
        if (!dayData.hourly) dayData.hourly = new Array(24).fill(0)

        const botName = isBot(ua)

        if (botName) {
            // Bot visit — track separately
            dayData.botVisits.push({
                t: now,
                ua: botName,
                p: page,
            })
        } else {
            // Human visit
            const refDomain = extractReferrerDomain(referrer || '')

            // Only keep the last 5000 individual visits per day to limit file size
            if (dayData.visits.length < 5000) {
                dayData.visits.push({
                    t: now,
                    p: page,
                    r: refDomain,
                    rf: (referrer && referrer !== 'direct' && referrer.length < 500) ? referrer : undefined,
                    c: country,
                    b: false,
                })
            }

            // Aggregate counters (always updated)
            dayData.pageViews[page] = (dayData.pageViews[page] || 0) + 1
            dayData.referrers[refDomain] = (dayData.referrers[refDomain] || 0) + 1
            dayData.countries[country] = (dayData.countries[country] || 0) + 1
            if (hour >= 0 && hour < 24) {
                dayData.hourly[hour] = (dayData.hourly[hour] || 0) + 1
            }
        }

        // Save asynchronously (don't await to respond faster)
        saveJsonFile(filePath, dayData).catch(err => {
            console.error('Failed to save analytics:', err)
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        // Never fail publicly — analytics should be invisible
        console.error('Track API error:', error)
        return NextResponse.json({ ok: true })
    }
}
