import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'
import { withAdminProtection } from '@/lib/security'

export const dynamic = 'force-dynamic'

const USERS_DB_FILE = 'auth-users.json'

/**
 * GET /api/auth/users
 * Admin only - Get all users
 */
export async function GET(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const users = await getJsonFile(USERS_DB_FILE) || []
            // Strip password hashes before sending
            const safeUsers = (Array.isArray(users) ? users : []).map((u: any) => {
                const { passwordHash, ...safe } = u
                return safe
            })
            return NextResponse.json(safeUsers)
        } catch {
            return NextResponse.json([])
        }
    })
}

/**
 * PUT /api/auth/users
 * Admin only - Update user membership, ban status, etc.
 * Body: { userId, action, data }
 * Actions: 'updateMembership', 'ban', 'unban'
 */
export async function PUT(request: NextRequest) {
    return withAdminProtection(request, async () => {
        try {
            const { userId, action, data } = await request.json()

            if (!userId || !action) {
                return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
            }

            let users = await getJsonFile(USERS_DB_FILE) || []
            if (!Array.isArray(users)) users = []

            const userIndex = users.findIndex((u: any) => u.id === userId)
            if (userIndex < 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }

            const user = users[userIndex]

            switch (action) {
                case 'updateMembership': {
                    const { membership, durationDays } = data || {}
                    if (!membership) {
                        return NextResponse.json({ error: 'membership is required' }, { status: 400 })
                    }

                    user.membership = membership

                    if ((membership === 'vip' || membership === 'premium' || membership === 'basic') && durationDays) {
                        // Set subscription end date
                        user.subscriptionEnd = new Date(
                            Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000
                        ).toISOString()
                    } else if (membership === 'guest') {
                        // Clear subscription end for guest
                        user.subscriptionEnd = undefined
                    }

                    break
                }

                case 'ban': {
                    const { reason } = data || {}
                    user.isBanned = true
                    user.banReason = reason || '관리자에 의해 차단됨'
                    break
                }

                case 'unban': {
                    user.isBanned = false
                    user.banReason = undefined
                    break
                }

                default:
                    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
            }

            users[userIndex] = user
            await saveJsonFile(USERS_DB_FILE, users)

            const { passwordHash, ...safeUser } = user
            return NextResponse.json({
                success: true,
                user: safeUser,
            })

        } catch (error: any) {
            console.error('User management error:', error)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    })
}
