import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { withAdminProtection, withRateLimitProtection } from '@/lib/security'

const SETTINGS_FILENAME = 'settings.json'

export const dynamic = 'force-dynamic'

// GET - Public read (rate limited) - site settings are needed for all visitors
export async function GET(request: NextRequest) {
    return withRateLimitProtection(request, async () => {
        const data = await getJsonFile(SETTINGS_FILENAME)
        return NextResponse.json(data || {})
    })
}

// POST - Admin only (protected)
export async function POST(req: NextRequest) {
    return withAdminProtection(req, async () => {
        const body = await req.json()
        const success = await saveJsonFile(SETTINGS_FILENAME, body)
        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: 'Failed to save settings to B2' }, { status: 500 })
        }
    })
}
