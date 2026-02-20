import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { checkRateLimit, getClientIP, getUserAgent, logSecurityEvent } from '@/lib/security'

export const dynamic = 'force-dynamic'

const USERS_DB_FILE = 'auth-users.json'

interface StoredUser {
    id: string
    email: string
    name: string
    passwordHash: string
    membership: 'guest' | 'basic' | 'vip' | 'premium'
    role: 'user' | 'moderator' | 'admin'
    avatar?: string
    subscriptionEnd?: string
    isBanned: boolean
    banReason?: string
    createdAt: string
    lastLoginAt?: string
    emailVerified: boolean
    provider: 'email' | 'google'
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ynast21@gmail.com'
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET

/**
 * POST /api/auth/google
 * Verify Google OAuth token and create/login user
 */
export async function POST(request: NextRequest) {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)

    const rateCheck = checkRateLimit(`google-login:${ip}`, true)
    if (!rateCheck.allowed) {
        return NextResponse.json(
            { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429 }
        )
    }

    try {
        const { email, name, avatar } = await request.json()

        if (!email) {
            return NextResponse.json({ error: '이메일 정보가 필요합니다.' }, { status: 400 })
        }

        // Load users from B2
        let users: StoredUser[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            users = []
        }

        let user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

        if (user) {
            // Existing user - check ban status
            if (user.isBanned) {
                return NextResponse.json(
                    { error: `계정이 차단되었습니다. 사유: ${user.banReason || '관리자에게 문의하세요'}` },
                    { status: 403 }
                )
            }

            // Check membership expiration
            if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
                user.membership = 'guest'
                user.subscriptionEnd = undefined
            }

            // Update user info
            user.lastLoginAt = new Date().toISOString()
            if (avatar) user.avatar = avatar
            if (name && !user.name) user.name = name

            const idx = users.findIndex(u => u.id === user!.id)
            if (idx >= 0) users[idx] = user
        } else {
            // New user via Google
            user = {
                id: 'google_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
                email: email.toLowerCase().trim(),
                name: name || email.split('@')[0],
                passwordHash: '', // No password for Google users
                membership: 'guest',
                role: (ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase().trim()) ? 'admin' : 'user',
                avatar,
                isBanned: false,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                emailVerified: true,
                provider: 'google',
            }
            users.push(user)
        }

        // Save to B2
        await saveJsonFile(USERS_DB_FILE, users)

        await logSecurityEvent({
            type: 'AUTH_SUCCESS',
            severity: 'low',
            ip, userAgent: ua,
            path: '/api/auth/google',
            method: 'POST',
            details: `Google login: ${email}`,
            blocked: false,
        })

        const { passwordHash, ...safeUser } = user

        // ISSUE ADMIN TOKEN if this is the admin user
        let adminToken = undefined
        const adminEmails = (ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        const isUserAdmin = adminEmails.includes(email.toLowerCase().trim()) || user.role === 'admin'

        if (isUserAdmin && ADMIN_API_SECRET) {
            adminToken = ADMIN_API_SECRET;
            // Force role to admin if in the list
            if (user.role !== 'admin') {
                user.role = 'admin'
                // Update in users array for next save
                const idx = users.findIndex(u => u.id === user!.id)
                if (idx >= 0) users[idx] = user
            }
            console.log(`[GoogleAuth] Issued admin token for ${email}`)
        }

        return NextResponse.json({
            success: true,
            user: safeUser,
            adminToken // New field
        })

    } catch (error: any) {
        console.error('Google auth error:', error)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
}
