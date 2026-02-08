import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'

export const dynamic = 'force-dynamic' // Disable caching for DB updates

export async function GET() {
    try {
        const data = await getDatabase()
        if (!data) {
            // Return null to indicate no DB exists yet (client should use initialData or local)
            return NextResponse.json(null)
        }
        return NextResponse.json(data)
    } catch (error) {
        console.error('Database GET failed:', error)
        return NextResponse.json({ error: 'Failed to fetch database' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Basic validation
        if (!body.streamers || !body.videos) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
        }

        const success = await saveDatabase(body)

        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: 'Failed to save to B2' }, { status: 500 })
        }
    } catch (error) {
        console.error('Database POST failed:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
