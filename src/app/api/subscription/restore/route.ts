import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const USERS_DB_FILE = 'auth-users.json'

/**
 * POST /api/subscription/restore
 * 
 * Restores a previously cancelled subscription.
 * Removes the subscriptionCancelled flag so auto-renewal continues.
 * VIP benefits were never interrupted - this just re-enables auto-renewal.
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

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

        // Check if subscription is actually cancelled
        if (!user.subscriptionCancelled) {
            return NextResponse.json({
                success: true,
                message: '자동 결제가 이미 활성 상태입니다.',
                alreadyActive: true,
            })
        }

        // Restore subscription - remove cancelled flags
        users[userIndex] = {
            ...user,
            subscriptionCancelled: false,
            subscriptionRestoredAt: new Date().toISOString(),
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

        console.log(`[Subscription Restore] User ${email} subscription restored.`)

        return NextResponse.json({
            success: true,
            message: '자동 결제가 다시 활성화되었습니다.',
            subscriptionEnd: user.subscriptionEnd,
        })

    } catch (error: any) {
        console.error('[Subscription Restore] Error:', error)
        return NextResponse.json(
            { error: error.message || '구독 복구 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        )
    }
}
