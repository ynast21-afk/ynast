import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

interface WatchHistoryItem {
    videoId: string
    watchedAt: string
    progress: number
}

interface DownloadHistoryItem {
    videoId: string
    downloadedAt: string
}

interface UserData {
    watchHistory: WatchHistoryItem[]
    downloadHistory: DownloadHistoryItem[]
}

const HISTORY_LIMIT = 100

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filename = `users/${user.id}.json`
    const data = await getJsonFile(filename) || { watchHistory: [], downloadHistory: [] }

    return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { type, item } = body

        if (!['watch', 'download'].includes(type) || !item) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const filename = `users/${user.id}.json`
        let data: UserData = (await getJsonFile(filename)) as UserData || { watchHistory: [], downloadHistory: [] }

        // Ensure data structure validity
        if (!data.watchHistory) data.watchHistory = []
        if (!data.downloadHistory) data.downloadHistory = []

        if (type === 'watch') {
            // Remove existing entry for this video
            data.watchHistory = data.watchHistory.filter(h => h.videoId !== item.videoId)
            // Add new entry
            data.watchHistory.unshift(item)
            // Limit size
            data.watchHistory = data.watchHistory.slice(0, HISTORY_LIMIT)
        } else if (type === 'download') {
            data.downloadHistory = data.downloadHistory.filter(h => h.videoId !== item.videoId)
            data.downloadHistory.unshift(item)
            data.downloadHistory = data.downloadHistory.slice(0, HISTORY_LIMIT)
        }

        const saved = await saveJsonFile(filename, data)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save data' }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (e) {
        console.error('History API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
