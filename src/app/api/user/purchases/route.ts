import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

// GET: Retrieve purchase history
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const filename = `user-data/${user.id}/purchases.json`
        const data = await getJsonFile(filename)

        return NextResponse.json({ purchases: data || [] })
    } catch (error) {
        console.error('GET /api/user/purchases error:', error)
        return NextResponse.json({ purchases: [] })
    }
}

// POST: Add purchase record
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { purchase } = body

        if (!purchase) {
            return NextResponse.json({ error: 'Missing purchase data' }, { status: 400 })
        }

        const filename = `user-data/${user.id}/purchases.json`
        const data = await getJsonFile(filename) || []

        // Add new purchase at the beginning
        data.unshift(purchase)

        // Keep max 200 records
        const trimmed = data.slice(0, 200)

        const saved = await saveJsonFile(filename, trimmed)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('POST /api/user/purchases error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
