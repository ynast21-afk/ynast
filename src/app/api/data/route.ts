import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { withAdminProtection, withRateLimitProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

// GET - Public read (rate limited) - certain data types are public
export async function GET(req: NextRequest) {
    return withRateLimitProtection(req, async () => {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 })
        }

        // Whitelist allowed public data types
        const publicTypes = ['users', 'inquiries', 'settings', 'stats']
        if (!publicTypes.includes(type)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const filename = `${type}.json`
        const data = await getJsonFile(filename)
        return NextResponse.json(data || (type === 'users' || type === 'inquiries' ? [] : {}))
    })
}

// POST - Admin only (protected)
export async function POST(req: NextRequest) {
    return withAdminProtection(req, async () => {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 })
        }

        // Prevent arbitrary file creation - whitelist allowed types
        const allowedTypes = ['users', 'inquiries', 'settings', 'stats']
        if (!allowedTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid data type' }, { status: 403 })
        }

        const filename = `${type}.json`
        const body = await req.json()
        const success = await saveJsonFile(filename, body)
        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: 'Failed to save to B2' }, { status: 500 })
        }
    })
}
