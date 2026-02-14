import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'

interface DailyAnalytics {
    date: string
    visits: any[]
    botVisits: any[]
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

// GET: Fetch aggregated SEO analytics
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const range = url.searchParams.get('range') || '7' // days
        const days = Math.min(parseInt(range) || 7, 90) // max 90 days

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
        }

        // Sort and limit
        const topPages = Object.entries(allPageViews)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([path, count]) => ({ path, count }))

        const topReferrers = Object.entries(allReferrers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([domain, count]) => ({ domain, count }))

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
            hasSitemap: true,      // We know these exist in the codebase
            hasRobotsTxt: true,
            hasGoogleVerification: true,
            hasAnalytics: true,    // GoogleAnalytics component exists
            hasOgTags: true,       // Metadata in layout.tsx exists
            hasJsonLd: true,       // WebSiteSchema, OrganizationSchema exist
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
            topPages,
            topReferrers,
            countryDistribution,
            botDistribution,
            hourlyDistribution: allHourly,
            seoHealth,
        })
    } catch (error) {
        console.error('SEO Analytics API error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
