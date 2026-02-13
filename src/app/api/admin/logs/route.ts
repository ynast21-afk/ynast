import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, saveDatabase } from '@/lib/b2'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const db = await getDatabase()
        const logs = db?.security_logs || []
        return NextResponse.json(logs)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { type, ip, reason, path } = await req.json()
        const db = await getDatabase()
        if (!db) return NextResponse.json({ error: 'DB not found' }, { status: 500 })

        const newLog = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type, // 'BLOCK', 'WARN', 'ATTACK'
            ip,
            reason,
            path
        }

        const updatedLogs = [newLog, ...(db.security_logs || [])].slice(0, 100) // Keep last 100 logs
        await saveDatabase({ ...db, security_logs: updatedLogs })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
    }
}
