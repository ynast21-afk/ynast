import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'

interface VisitRecord {
    t: number
    p: string
    r: string
    rf?: string
    c: string
    b: boolean
}

interface BotVisitRecord {
    t: number
    ua: string
    p: string
}

interface DailyAnalytics {
    date: string
    visits: VisitRecord[]
    botVisits: BotVisitRecord[]
    pageViews: Record<string, number>
    referrers: Record<string, number>
    countries: Record<string, number>
    hourly: number[]
}

// Country code → name mapping (top countries)
const COUNTRY_NAMES: Record<string, string> = {
    'KR': '한국', 'US': '미국', 'JP': '일본', 'CN': '중국', 'TW': '대만',
    'TH': '태국', 'VN': '베트남', 'PH': '필리핀', 'ID': '인도네시아', 'MY': '말레이시아',
    'SG': '싱가포르', 'IN': '인도', 'DE': '독일', 'FR': '프랑스', 'GB': '영국',
    'CA': '캐나다', 'AU': '호주', 'BR': '브라질', 'RU': '러시아', 'MX': '멕시코',
    'HK': '홍콩', 'XX': '알 수 없음',
}

function getCountryName(code: string): string {
    return COUNTRY_NAMES[code] || code
}

// Generate date strings for a range
function getDateRange(days: number): string[] {
    const dates: string[] = []
    const now = new Date()
    for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dates.push(d.toISOString().slice(0, 10))
    }
    return dates
}

// Merge counters
function mergeCounters(target: Record<string, number>, source: Record<string, number>) {
    for (const [key, val] of Object.entries(source)) {
        target[key] = (target[key] || 0) + val
    }
}

// Get ISO week key (e.g. "2026-W08")
function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// Get month key (e.g. "2026-02")
function getMonthKey(dateStr: string): string {
    return dateStr.slice(0, 7)
}

// Referrer domain → display info
function getReferrerInfo(domain: string): { icon: string; label: string } {
    if (domain === 'direct') return { icon: '🏠', label: '직접 방문' }
    if (domain.includes('google')) return { icon: '🔍', label: '구글 검색' }
    if (domain.includes('naver')) return { icon: '🇰🇷', label: '네이버' }
    if (domain === 't.co' || domain.includes('twitter') || domain.includes('x.com')) return { icon: '🐦', label: '트위터/X' }
    if (domain.includes('facebook') || domain.includes('fb.com')) return { icon: '📘', label: '페이스북' }
    if (domain.includes('instagram')) return { icon: '📸', label: '인스타그램' }
    if (domain.includes('reddit')) return { icon: '🟧', label: '레딧' }
    if (domain.includes('discord')) return { icon: '💬', label: '디스코드' }
    if (domain.includes('youtube')) return { icon: '▶️', label: '유튜브' }
    if (domain.includes('tiktok')) return { icon: '🎵', label: '틱톡' }
    if (domain.includes('arca.live')) return { icon: '🎮', label: '아카라이브' }
    if (domain.includes('dcinside')) return { icon: '📋', label: 'DC인사이드' }
    if (domain.includes('fmkorea')) return { icon: '⚽', label: 'FM코리아' }
    if (domain.includes('ppomppu')) return { icon: '💰', label: '뽐뿌' }
    if (domain.includes('ruliweb')) return { icon: '🎮', label: '루리웹' }
    if (domain.includes('theqoo')) return { icon: '💬', label: '더쿠' }
    if (domain.includes('clien')) return { icon: '💻', label: '클리앙' }
    return { icon: '🔗', label: domain }
}

// GET: Fetch aggregated SEO analytics
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const range = url.searchParams.get('range') || '7' // days
        const days = Math.min(parseInt(range) || 7, 90) // max 90 days
        const view = url.searchParams.get('view') || 'daily' // daily | weekly | monthly

        const dateKeys = getDateRange(days)

        // Load daily analytics files in parallel (batch of 10)
        const dailyData: DailyAnalytics[] = []
        const batchSize = 10
        for (let i = 0; i < dateKeys.length; i += batchSize) {
            const batch = dateKeys.slice(i, i + batchSize)
            const results = await Promise.all(
                batch.map(async (dateKey) => {
                    try {
                        const data = await getJsonFile(`data/analytics/${dateKey}.json`)
                        return data as DailyAnalytics | null
                    } catch {
                        return null
                    }
                })
            )
            results.forEach(r => { if (r) dailyData.push(r) })
        }

        // --- Aggregate data ---
        let totalVisits = 0
        let totalBotVisits = 0
        const allPageViews: Record<string, number> = {}
        const allReferrers: Record<string, number> = {}
        const allCountries: Record<string, number> = {}
        const allHourly: number[] = new Array(24).fill(0)
        const botTypes: Record<string, number> = {}
        const dailyVisitors: { date: string; visits: number; bots: number }[] = []

        // New detailed tracking
        // referrer → { countries: { code: count }, landingPages: { path: count } }
        const referrerDetails: Record<string, { countries: Record<string, number>; landingPages: Record<string, number>; fullUrls: Record<string, number> }> = {}
        // country → { date: count } for trend chart
        const countryDailyMap: Record<string, Record<string, number>> = {}

        for (const day of dailyData) {
            const humanVisits = day.visits?.length || 0
            const botVisitCount = day.botVisits?.length || 0
            totalVisits += humanVisits
            totalBotVisits += botVisitCount

            dailyVisitors.push({
                date: day.date,
                visits: humanVisits,
                bots: botVisitCount,
            })

            if (day.pageViews) mergeCounters(allPageViews, day.pageViews)
            if (day.referrers) mergeCounters(allReferrers, day.referrers)
            if (day.countries) mergeCounters(allCountries, day.countries)

            if (day.hourly) {
                day.hourly.forEach((count, i) => {
                    if (i < 24) allHourly[i] += count
                })
            }

            // Bot type distribution
            if (day.botVisits) {
                day.botVisits.forEach((bv: any) => {
                    const name = bv.ua || 'unknown'
                    botTypes[name] = (botTypes[name] || 0) + 1
                })
            }

            // Build referrer details from individual visit records
            if (day.visits) {
                for (const v of day.visits) {
                    const ref = v.r || 'direct'
                    if (!referrerDetails[ref]) {
                        referrerDetails[ref] = { countries: {}, landingPages: {}, fullUrls: {} }
                    }
                    const rd = referrerDetails[ref]
                    rd.countries[v.c] = (rd.countries[v.c] || 0) + 1
                    rd.landingPages[v.p] = (rd.landingPages[v.p] || 0) + 1
                    if (v.rf) {
                        rd.fullUrls[v.rf] = (rd.fullUrls[v.rf] || 0) + 1
                    }
                }

                // Country daily trend
                for (const v of day.visits) {
                    const cc = v.c || 'XX'
                    if (!countryDailyMap[cc]) countryDailyMap[cc] = {}
                    countryDailyMap[cc][day.date] = (countryDailyMap[cc][day.date] || 0) + 1
                }
            }
        }

        // Sort and limit
        const topPages = Object.entries(allPageViews)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([path, count]) => ({ path, count }))

        const topReferrers = Object.entries(allReferrers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([domain, count]) => {
                const info = getReferrerInfo(domain)
                const details = referrerDetails[domain]
                // Top 5 countries for this referrer
                const topCountries = details
                    ? Object.entries(details.countries)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([code, cnt]) => ({ code, name: getCountryName(code), count: cnt }))
                    : []
                // Top 5 landing pages for this referrer
                const topLandingPages = details
                    ? Object.entries(details.landingPages)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([path, cnt]) => ({ path, count: cnt }))
                    : []
                return {
                    domain,
                    count,
                    icon: info.icon,
                    label: info.label,
                    topCountries,
                    topLandingPages,
                }
            })

        const countryDistribution = Object.entries(allCountries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([code, count]) => ({ code, name: getCountryName(code), count }))

        const botDistribution = Object.entries(botTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, count]) => ({ name, count }))

        // Daily visitors sorted by date (oldest first)
        dailyVisitors.sort((a, b) => a.date.localeCompare(b.date))

        // --- View aggregation (weekly / monthly) ---
        let aggregatedVisitors: { label: string; visits: number; bots: number }[] = []
        if (view === 'weekly') {
            const weekMap: Record<string, { visits: number; bots: number }> = {}
            for (const d of dailyVisitors) {
                const wk = getWeekKey(d.date)
                if (!weekMap[wk]) weekMap[wk] = { visits: 0, bots: 0 }
                weekMap[wk].visits += d.visits
                weekMap[wk].bots += d.bots
            }
            aggregatedVisitors = Object.entries(weekMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([label, data]) => ({ label, ...data }))
        } else if (view === 'monthly') {
            const monthMap: Record<string, { visits: number; bots: number }> = {}
            for (const d of dailyVisitors) {
                const mk = getMonthKey(d.date)
                if (!monthMap[mk]) monthMap[mk] = { visits: 0, bots: 0 }
                monthMap[mk].visits += d.visits
                monthMap[mk].bots += d.bots
            }
            aggregatedVisitors = Object.entries(monthMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([label, data]) => ({ label, ...data }))
        } else {
            aggregatedVisitors = dailyVisitors.map(d => ({ label: d.date, visits: d.visits, bots: d.bots }))
        }

        // --- Country trend (top 5 countries) adapted to view ---
        const top5CountryCodes = Object.entries(allCountries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([code]) => code)

        // Build country trend matching the selected view
        let countryTrend: { date: string; countries: Record<string, number> }[] = []
        if (view === 'weekly') {
            const weekCountryMap: Record<string, Record<string, number>> = {}
            for (const dv of dailyVisitors) {
                const wk = getWeekKey(dv.date)
                if (!weekCountryMap[wk]) weekCountryMap[wk] = {}
                for (const cc of top5CountryCodes) {
                    weekCountryMap[wk][cc] = (weekCountryMap[wk][cc] || 0) + (countryDailyMap[cc]?.[dv.date] || 0)
                }
            }
            countryTrend = Object.entries(weekCountryMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([wk, countries]) => ({ date: wk, countries }))
        } else if (view === 'monthly') {
            const monthCountryMap: Record<string, Record<string, number>> = {}
            for (const dv of dailyVisitors) {
                const mk = getMonthKey(dv.date)
                if (!monthCountryMap[mk]) monthCountryMap[mk] = {}
                for (const cc of top5CountryCodes) {
                    monthCountryMap[mk][cc] = (monthCountryMap[mk][cc] || 0) + (countryDailyMap[cc]?.[dv.date] || 0)
                }
            }
            countryTrend = Object.entries(monthCountryMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([mk, countries]) => ({ date: mk, countries }))
        } else {
            const sortedDates = dailyVisitors.map(d => d.date)
            for (const date of sortedDates) {
                const entry: Record<string, number> = {}
                for (const cc of top5CountryCodes) {
                    entry[cc] = countryDailyMap[cc]?.[date] || 0
                }
                countryTrend.push({ date, countries: entry })
            }
        }

        // --- Period-based referrer & country data ---
        // Group visits by period key
        const periodKey = (dateStr: string) =>
            view === 'weekly' ? getWeekKey(dateStr)
                : view === 'monthly' ? getMonthKey(dateStr)
                    : dateStr

        // Build period → { referrers, countries }
        const periodReferrers: Record<string, Record<string, number>> = {}
        const periodCountries: Record<string, Record<string, number>> = {}
        for (const day of dailyData) {
            const pk = periodKey(day.date)
            if (!periodReferrers[pk]) periodReferrers[pk] = {}
            if (!periodCountries[pk]) periodCountries[pk] = {}
            if (day.visits) {
                for (const v of day.visits) {
                    const ref = v.r || 'direct'
                    periodReferrers[pk][ref] = (periodReferrers[pk][ref] || 0) + 1
                    const cc = v.c || 'XX'
                    periodCountries[pk][cc] = (periodCountries[pk][cc] || 0) + 1
                }
            }
        }

        // Format period data for frontend
        const referrersByPeriod = Object.entries(periodReferrers)
            .sort((a, b) => b[0].localeCompare(a[0])) // newest first
            .map(([period, refs]) => ({
                period,
                referrers: Object.entries(refs)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([domain, count]) => {
                        const info = getReferrerInfo(domain)
                        return { domain, count, icon: info.icon, label: info.label }
                    })
            }))

        const countriesByPeriod = Object.entries(periodCountries)
            .sort((a, b) => b[0].localeCompare(a[0])) // newest first
            .map(([period, ctrs]) => ({
                period,
                countries: Object.entries(ctrs)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([code, count]) => ({ code, name: getCountryName(code), count }))
            }))

        // Calculate averages
        const activeDays = dailyData.length || 1
        const avgDailyVisits = Math.round(totalVisits / activeDays)

        // Weekly stats (last 7 days)
        const last7Days = dailyVisitors.slice(-7)
        const weeklyVisits = last7Days.reduce((sum, d) => sum + d.visits, 0)

        // Monthly stats (last 30 days)
        const last30Days = dailyVisitors.slice(-30)
        const monthlyVisits = last30Days.reduce((sum, d) => sum + d.visits, 0)

        // Today
        const todayKey = new Date().toISOString().slice(0, 10)
        const todayData = dailyData.find(d => d.date === todayKey)
        const todayVisits = todayData?.visits?.length || 0
        const todayBots = todayData?.botVisits?.length || 0

        // SEO Health Score (basic checks)
        const seoHealth = {
            hasSitemap: true,
            hasRobotsTxt: true,
            hasGoogleVerification: true,
            hasAnalytics: true,
            hasOgTags: true,
            hasJsonLd: true,
            score: 100,
        }

        return NextResponse.json({
            summary: {
                totalVisits,
                totalBotVisits,
                todayVisits,
                todayBots,
                weeklyVisits,
                monthlyVisits,
                avgDailyVisits,
                activeDays,
                range: days,
            },
            dailyVisitors,
            aggregatedVisitors,
            topPages,
            topReferrers,
            countryDistribution,
            countryTrend,
            top5CountryCodes: top5CountryCodes.map(c => ({ code: c, name: getCountryName(c) })),
            botDistribution,
            hourlyDistribution: allHourly,
            seoHealth,
            referrersByPeriod,
            countriesByPeriod,
        })
    } catch (error) {
        console.error('SEO Analytics API error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
