import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCredentials, hashPassword, logSecurityEvent, getClientIP, getUserAgent, checkRateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/admin-verify
 * Verify admin credentials server-side and return admin token.
 * This replaces the old client-side-only admin check.
 */
export async function POST(request: NextRequest) {
    const ip = getClientIP(request)
    const ua = getUserAgent(request)

    // Rate limit login attempts: max 5 per minute
    const rateCheck = checkRateLimit(`login:${ip}`, true)
    if (!rateCheck.allowed) {
        await logSecurityEvent({
            type: 'RATE_LIMIT_HIT',
            severity: 'critical',
            ip, userAgent: ua,
            path: '/api/auth/admin-verify',
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
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        // Server-side credential verification
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
        const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''

        // If env vars aren't set, fall back to legacy hardcoded check
        // (this ensures backward compatibility during migration)
        let isValid = false

        if (ADMIN_EMAIL && ADMIN_PASSWORD_HASH) {
            // Preferred: env-based verification
            isValid = email === ADMIN_EMAIL && hashPassword(password) === ADMIN_PASSWORD_HASH
        } else {
            // Fallback: legacy check (will be removed after env setup)
            isValid = email === 'ynast21@gmail.com' && password === 'dkf@741852'
        }

        if (!isValid) {
            await logSecurityEvent({
                type: 'ADMIN_LOGIN_FAILED',
                severity: 'high',
                ip, userAgent: ua,
                path: '/api/auth/admin-verify',
                method: 'POST',
                details: `Failed admin login attempt for email: ${email}`,
                blocked: true,
            })
            return NextResponse.json({ error: '로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
        }

        // Success - return the admin API secret as a session token
        const adminSecret = process.env.ADMIN_API_SECRET || ''

        await logSecurityEvent({
            type: 'ADMIN_LOGIN',
            severity: 'low',
            ip, userAgent: ua,
            path: '/api/auth/admin-verify',
            method: 'POST',
            details: `Admin login successful: ${email}`,
            blocked: false,
        })

        return NextResponse.json({
            success: true,
            isAdmin: true,
            adminToken: adminSecret, // Client stores this in memory/sessionStorage
        })

    } catch (error: any) {
        console.error('Admin auth error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
