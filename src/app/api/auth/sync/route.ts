import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile } from '@/lib/b2'

const USERS_DB_FILE = 'auth-users.json'

/**
 * POST /api/auth/sync
 * 
 * Returns the latest user data from B2 (auth-users.json) for client-side sync.
 * Used to sync membership status after webhook updates, Gumroad payments, etc.
 * Strips passwordHash before returning.
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email required' }, { status: 400 })
        }

        let users: any[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            return NextResponse.json({ error: 'DB read failed' }, { status: 500 })
        }

        const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Return user data without sensitive fields
        const { passwordHash, ...safeUser } = user
        return NextResponse.json({ user: safeUser })
    } catch (error) {
        console.error('[Auth Sync] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
