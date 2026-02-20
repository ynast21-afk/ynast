import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const USERS_DB_FILE = 'auth-users.json'

/**
 * POST /api/subscription/cancel
 * 
 * Internal subscription cancellation API.
 * Marks the user's subscription as cancelled in B2.
 * VIP benefits remain active until subscriptionEnd date.
 * 
 * This is a fallback/primary handler that works regardless of
 * whether external payment provider APIs (Gumroad, PayPal, Paddle)
 * are configured or not.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, reason } = await request.json()

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: '이메일이 필요합니다.' },
                { status: 400 }
            )
        }

        // Read current users from B2
        let users: any[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            return NextResponse.json(
                { error: 'DB 읽기 실패' },
                { status: 500 }
            )
        }

        // Find user by email
        const userIndex = users.findIndex(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (userIndex === -1) {
            return NextResponse.json(
                { error: '사용자를 찾을 수 없습니다.' },
                { status: 404 }
            )
        }

        const user = users[userIndex]

        // Check if already cancelled
        if (user.subscriptionCancelled) {
            return NextResponse.json({
                success: true,
                message: '이미 해지 처리된 구독입니다.',
                alreadyCancelled: true,
                subscriptionEnd: user.subscriptionEnd,
            })
        }

        // Mark subscription as cancelled
        users[userIndex] = {
            ...user,
            subscriptionCancelled: true,
            subscriptionCancelledAt: new Date().toISOString(),
            subscriptionCancelReason: reason || 'User cancelled from MyPage',
            updatedAt: new Date().toISOString(),
        }

        // Save updated users to B2
        const saved = await saveJsonFile(USERS_DB_FILE, users)
        if (!saved) {
            return NextResponse.json(
                { error: 'DB 저장 실패. 다시 시도해 주세요.' },
                { status: 500 }
            )
        }

        console.log(`[Subscription Cancel] User ${email} subscription cancelled. Reason: ${reason || 'Not specified'}. Benefits active until: ${user.subscriptionEnd}`)

        return NextResponse.json({
            success: true,
            message: '자동 결제가 해지되었습니다. 현재 결제 기간 종료까지 VIP 혜택이 유지됩니다.',
            subscriptionEnd: user.subscriptionEnd,
        })

    } catch (error: any) {
        console.error('[Subscription Cancel] Error:', error)
        return NextResponse.json(
            { error: error.message || '구독 해지 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        )
    }
}
