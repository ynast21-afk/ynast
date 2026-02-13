import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { checkRateLimit, getClientIP, getUserAgent, logSecurityEvent, hashPassword } from '@/lib/security'

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

/**
 * POST /api/auth/signup
 * Create a new user account with email + password
 */
export async function POST(request: NextRequest) {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)

    // Rate limit signup attempts: prevent mass account creation
    const rateCheck = checkRateLimit(`signup:${ip}`, true)
    if (!rateCheck.allowed) {
        await logSecurityEvent({
            type: 'RATE_LIMIT_HIT',
            severity: 'high',
            ip, userAgent: ua,
            path: '/api/auth/signup',
            method: 'POST',
            details: 'Signup rate limit exceeded',
            blocked: true,
        })
        return NextResponse.json(
            { error: '회원가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429 }
        )
    }

    try {
        const { email, password, name } = await request.json()

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
        }

        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 })
        }

        if (typeof name !== 'string' || name.trim().length < 2) {
            return NextResponse.json({ error: '이름은 최소 2자 이상이어야 합니다.' }, { status: 400 })
        }

        // Load existing users from B2
        let users: StoredUser[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            // File doesn't exist yet, start with empty array
            users = []
        }

        // Check for duplicate email
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 })
        }

        // Create new user
        const newUser: StoredUser = {
            id: 'user_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
            email: email.toLowerCase().trim(),
            name: name.trim(),
            passwordHash: hashPassword(password),
            membership: 'guest',
            role: 'user',
            isBanned: false,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            emailVerified: false,
            provider: 'email',
        }

        // Save to B2
        users.push(newUser)
        await saveJsonFile(USERS_DB_FILE, users)

        await logSecurityEvent({
            type: 'AUTH_SUCCESS',
            severity: 'low',
            ip, userAgent: ua,
            path: '/api/auth/signup',
            method: 'POST',
            details: `New user registered: ${email}`,
            blocked: false,
        })

        // Return user data (without passwordHash)
        const { passwordHash, ...safeUser } = newUser
        return NextResponse.json({
            success: true,
            user: safeUser,
        })

    } catch (error: any) {
        console.error('Signup error:', error)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
}
