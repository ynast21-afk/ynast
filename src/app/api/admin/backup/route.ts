import { NextRequest, NextResponse } from 'next/server'
import { listBackups, getJsonFile, saveDatabase } from '@/lib/b2'
import { getUserFromRequest, isAdmin, AuthErrors } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        // 🔒 Admin-only Check
        const user = getUserFromRequest(req)
        if (!isAdmin(user)) {
            return NextResponse.json(AuthErrors.FORBIDDEN, { status: 403 })
        }

        const backups = await listBackups()
        return NextResponse.json(backups)
    } catch (error) {
        console.error('Backup list GET failed:', error)
        return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        // 🔒 Admin-only Check
        const user = getUserFromRequest(req)
        if (!isAdmin(user)) {
            return NextResponse.json(AuthErrors.FORBIDDEN, { status: 403 })
        }

        const body = await req.json()
        const { fileName } = body

        if (!fileName) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
        }

        // 1. Fetch the backup data
        const backupData = await getJsonFile(fileName)
        if (!backupData) {
            return NextResponse.json({ error: 'Backup file not found or invalid' }, { status: 404 })
        }

        // 2. Restore it as the main database
        const success = await saveDatabase(backupData)

        if (success) {
            return NextResponse.json({ success: true, message: `Successfully restored from ${fileName}` })
        } else {
            return NextResponse.json({ error: 'Failed to save restored data to B2' }, { status: 500 })
        }
    } catch (error) {
        console.error('Restore POST failed:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
