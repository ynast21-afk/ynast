import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const NOTIFICATIONS_FILE = 'data/admin-notifications.json'

// GET: Retrieve admin notifications
export async function GET() {
    try {
        const data = await getJsonFile(NOTIFICATIONS_FILE) || []
        return NextResponse.json({ notifications: data.slice(0, 100) })
    } catch (error) {
        console.error('GET /api/admin/notifications error:', error)
        return NextResponse.json({ notifications: [] })
    }
}

// POST: Add notification or clear all
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Clear all notifications
        if (body.action === 'clear') {
            const saved = await saveJsonFile(NOTIFICATIONS_FILE, [])
            return NextResponse.json({ success: saved })
        }

        const { notification } = body
        if (!notification) {
            return NextResponse.json({ error: 'Missing notification data' }, { status: 400 })
        }

        const data = await getJsonFile(NOTIFICATIONS_FILE) || []

        // Add new notification at the beginning
        data.unshift(notification)

        // Keep max 500 notifications
        const trimmed = data.slice(0, 500)

        const saved = await saveJsonFile(NOTIFICATIONS_FILE, trimmed)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('POST /api/admin/notifications error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
