import { NextRequest, NextResponse } from 'next/server'
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
 * POST /api/auth/login
 * Authenticate user with email + password
 */
export async function POST(request: NextRequest) {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)

    // Rate limit login attempts
    const rateCheck = checkRateLimit(`login:${ip}`, true)
    if (!rateCheck.allowed) {
        await logSecurityEvent({
            type: 'RATE_LIMIT_HIT',
            severity: 'critical',
            ip, userAgent: ua,
            path: '/api/auth/login',
            method: 'POST',
            details: 'Login rate limit exceeded - possible brute force attack',
            blocked: true,
        })
        return NextResponse.json(
            { error: '로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429 }
        )
    }

    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 })
        }

        // Load users from B2
        let users: StoredUser[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            // No users file yet
        }

        // Find user by email
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())

        if (!user) {
            await logSecurityEvent({
                type: 'AUTH_FAILURE',
                severity: 'medium',
                ip, userAgent: ua,
                path: '/api/auth/login',
                method: 'POST',
                details: `Login failed - user not found: ${email}`,
                blocked: true,
            })
            return NextResponse.json(
                { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
                { status: 401 }
            )
        }

        // Check if user is banned
        if (user.isBanned) {
            await logSecurityEvent({
                type: 'AUTH_FAILURE',
                severity: 'high',
                ip, userAgent: ua,
                path: '/api/auth/login',
                method: 'POST',
                details: `Banned user attempted login: ${email}`,
                blocked: true,
            })
            return NextResponse.json(
                { error: `계정이 차단되었습니다. 사유: ${user.banReason || '관리자에게 문의하세요'}` },
                { status: 403 }
            )
        }

        // Google accounts cannot login with password
        if (user.provider === 'google') {
            return NextResponse.json(
                { error: '이 계정은 Google 로그인으로 가입되었습니다. Google 로그인을 이용해주세요.' },
                { status: 400 }
            )
        }

        // Verify password
        const passwordHash = hashPassword(password)
        if (passwordHash !== user.passwordHash) {
            await logSecurityEvent({
                type: 'AUTH_FAILURE',
                severity: 'medium',
                ip, userAgent: ua,
                path: '/api/auth/login',
                method: 'POST',
                details: `Login failed - wrong password for: ${email}`,
                blocked: true,
            })
            return NextResponse.json(
                { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
                { status: 401 }
            )
        }

        // Check membership expiration
        let membershipUpdated = false
        if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
            user.membership = 'guest'
            user.subscriptionEnd = undefined
            membershipUpdated = true
        }

        // Update last login
        user.lastLoginAt = new Date().toISOString()

        // Save updated user data
        const userIndex = users.findIndex(u => u.id === user.id)
        if (userIndex >= 0) {
            users[userIndex] = user
            await saveJsonFile(USERS_DB_FILE, users)
        }

        await logSecurityEvent({
            type: 'AUTH_SUCCESS',
            severity: 'low',
            ip, userAgent: ua,
            path: '/api/auth/login',
            method: 'POST',
            details: `User logged in: ${email}${membershipUpdated ? ' (membership expired → guest)' : ''}`,
            blocked: false,
        })

        // Check for admin role upgrade
        const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET
        const isUserAdmin = adminEmails.includes(email.toLowerCase().trim()) || user.role === 'admin'

        // Issue admin token if applicable
        let adminToken = undefined
        if (isUserAdmin && ADMIN_API_SECRET) {
            adminToken = ADMIN_API_SECRET
            if (user.role !== 'admin') {
                user.role = 'admin'
                users[userIndex] = user
                // Save again with new role
                await saveJsonFile(USERS_DB_FILE, users)
            }
        }

        // Return user data (without passwordHash)
        const { passwordHash: _, ...safeUser } = user
        return NextResponse.json({
            success: true,
            user: safeUser,
            adminToken
        })

    } catch (error: any) {
        console.error('Login error:', error)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
}
