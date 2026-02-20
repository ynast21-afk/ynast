import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/queue-store'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

async function handleGET() {
    return NextResponse.json(getSettings())
}

async function handlePOST(request: NextRequest) {
    try {
        const body = await request.json()
        const settings = {
            titleSource: body.titleSource === 'fileName' ? 'fileName' as const : 'pageTitle' as const,
        }
        const saved = saveSettings(settings)
        if (!saved) {
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
        }
        return NextResponse.json({ success: true, ...settings })
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    return withAdminProtection(request, handleGET)
}

export async function POST(request: NextRequest) {
    return withAdminProtection(request, () => handlePOST(request))
}
