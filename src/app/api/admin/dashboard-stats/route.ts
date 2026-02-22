import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, getJsonFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'

// KST date key helper
function getKSTDateKey(offsetDays = 0): string {
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    if (offsetDays) kst.setDate(kst.getDate() - offsetDays)
    return kst.toISOString().slice(0, 10)
}

// GET - Fetch aggregated dashboard statistics from B2
export async function GET(request: NextRequest) {
    try {
        // Load all data from B2 in parallel
        const [database, comments, adminNotifications] = await Promise.all([
            getDatabase(),
            getJsonFile('data/comments.json').catch(() => []),
            getJsonFile('data/admin-notifications.json').catch(() => []),
        ])

        // --- Analytics-based visitor counts (accurate) ---
        const todayKey = getKSTDateKey(0)
        let analyticsTotal = 0
        let analyticsTodayVisits = 0

        // Load today's analytics
        try {
            const todayData = await getJsonFile(`data/analytics/${todayKey}.json`)
            if (todayData?.visits) {
                analyticsTodayVisits = todayData.visits.length
            }
        } catch { /* no data for today yet */ }

        // Load last 90 days for total count (in batches of 10)
        const dateKeys: string[] = []
        for (let i = 0; i < 90; i++) {
            dateKeys.push(getKSTDateKey(i))
        }

        for (let b = 0; b < dateKeys.length; b += 10) {
            const batch = dateKeys.slice(b, b + 10)
            const results = await Promise.all(
                batch.map(async (dk) => {
                    try {
                        return await getJsonFile(`data/analytics/${dk}.json`)
                    } catch { return null }
                })
            )
            for (const r of results) {
                if (r?.visits) analyticsTotal += r.visits.length
            }
        }

        const videos = database?.videos || []
        const streamers = database?.streamers || []

        // --- 1. Video Stats ---
        const totalViews = videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0)
        const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.likes || 0), 0)

        // Top 10 videos by views
        const topVideosByViews = [...videos]
            .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
            .slice(0, 10)
            .map((v: any) => ({
                id: v.id,
                title: v.title || 'Untitled',
                views: v.views || 0,
                likes: v.likes || 0,
                streamer: streamers.find((s: any) => s.id === v.streamerId)?.name || 'Unknown',
            }))

        // Top 10 videos by likes
        const topVideosByLikes = [...videos]
            .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10)
            .map((v: any) => ({
                id: v.id,
                title: v.title || 'Untitled',
                views: v.views || 0,
                likes: v.likes || 0,
                streamer: streamers.find((s: any) => s.id === v.streamerId)?.name || 'Unknown',
            }))

        // --- 2. Streamer Stats (videos per streamer) ---
        const streamerStats = streamers.map((s: any) => {
            const streamerVideos = videos.filter((v: any) => v.streamerId === s.id)
            return {
                id: s.id,
                name: s.name,
                videoCount: streamerVideos.length,
                totalViews: streamerVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0),
                totalLikes: streamerVideos.reduce((sum: number, v: any) => sum + (v.likes || 0), 0),
            }
        }).sort((a: any, b: any) => b.totalViews - a.totalViews)

        // --- 3. Tag Distribution ---
        const tagMap: Record<string, number> = {}
        videos.forEach((v: any) => {
            const tags = v.tags || []
            tags.forEach((tag: string) => {
                tagMap[tag] = (tagMap[tag] || 0) + 1
            })
        })
        const tagDistribution = Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, count]) => ({ name, count }))

        // --- 4. Upload Timeline (recent 30 days) ---
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const uploadTimeline: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const key = d.toISOString().slice(0, 10)
            uploadTimeline[key] = 0
        }

        videos.forEach((v: any) => {
            if (v.uploadedAt) {
                const dateKey = v.uploadedAt.slice(0, 10)
                if (uploadTimeline[dateKey] !== undefined) {
                    uploadTimeline[dateKey]++
                }
            }
        })

        const uploadTimelineArray = Object.entries(uploadTimeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date: date.slice(5), count })) // MM-DD format

        // --- 5. Membership distribution from users DB ---
        const usersData = database?.users || []
        const membershipDist: Record<string, number> = { guest: 0, basic: 0, vip: 0, premium: 0 }
        usersData.forEach((u: any) => {
            const level = u.membership || 'guest'
            membershipDist[level] = (membershipDist[level] || 0) + 1
        })
        const membershipDistribution = Object.entries(membershipDist)
            .map(([name, count]) => ({ name, count }))

        // --- 6. Comment activity (recent 30 days) ---
        const commentTimeline: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const key = d.toISOString().slice(0, 10)
            commentTimeline[key] = 0
        }

        const allComments = Array.isArray(comments) ? comments : []
        allComments.forEach((c: any) => {
            if (c.timestamp) {
                const dateKey = new Date(c.timestamp).toISOString().slice(0, 10)
                if (commentTimeline[dateKey] !== undefined) {
                    commentTimeline[dateKey]++
                }
            }
        })

        const commentTimelineArray = Object.entries(commentTimeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date: date.slice(5), count })) // MM-DD format

        // --- 7. Notification counts by type ---
        const allNotifications = Array.isArray(adminNotifications) ? adminNotifications : []
        const notifByType: Record<string, number> = { comment: 0, like: 0, payment: 0, follow: 0, other: 0 }
        allNotifications.forEach((n: any) => {
            const type = n.type || 'other'
            notifByType[type] = (notifByType[type] || 0) + 1
        })
        const notificationDistribution = Object.entries(notifByType)
            .filter(([_, count]) => count > 0)
            .map(([name, count]) => ({ name, count }))

        // --- 8. Subscription Provider Distribution ---
        const providerDist: Record<string, number> = { paypal: 0, paddle: 0, gumroad: 0, none: 0 }
        usersData.forEach((u: any) => {
            if (u.membership === 'vip' || u.membership === 'premium') {
                const provider = u.subscriptionProvider || 'none'
                providerDist[provider] = (providerDist[provider] || 0) + 1
            }
        })
        const providerDistribution = Object.entries(providerDist)
            .filter(([_, count]) => count > 0)
            .map(([name, count]) => ({ name, count }))

        // --- 9. Content Stats Summary ---
        const vipVideoCount = videos.filter((v: any) => v.isVip).length
        const freeVideoCount = videos.length - vipVideoCount

        return NextResponse.json({
            summary: {
                totalVideos: videos.length,
                totalStreamers: streamers.length,
                totalViews,
                totalLikes,
                totalComments: allComments.length,
                totalUsers: usersData.length,
                vipVideoCount,
                freeVideoCount,
                // Analytics-based accurate visitor counts (봇 제외, 서버 track 기반)
                totalVisitors: analyticsTotal,
                todayVisitors: analyticsTodayVisits,
            },
            topVideosByViews,
            topVideosByLikes,
            streamerStats: streamerStats.slice(0, 15),
            tagDistribution,
            uploadTimeline: uploadTimelineArray,
            membershipDistribution,
            commentTimeline: commentTimelineArray,
            notificationDistribution,
            providerDistribution,
        })
    } catch (error) {
        console.error('Dashboard stats API error:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }
}
