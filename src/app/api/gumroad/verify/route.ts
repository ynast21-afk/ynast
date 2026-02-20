import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const USERS_DB_FILE = 'auth-users.json'

/**
 * Gumroad License/Sale Verification + VIP Activation API
 * 
 * Verifies a Gumroad purchase by checking the sale status via Gumroad API.
 * If valid, immediately activates VIP membership in auth-users.json.
 * Called from the client after successful payment redirect.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { saleId, email } = body

        if (!saleId) {
            return NextResponse.json({ error: 'Missing sale ID' }, { status: 400 })
        }

        const accessToken = process.env.GUMROAD_ACCESS_TOKEN
        if (!accessToken) {
            console.error('[Gumroad Verify] GUMROAD_ACCESS_TOKEN not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Verify the sale via Gumroad API
        const res = await fetch(`https://api.gumroad.com/v2/sales/${saleId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('[Gumroad Verify] API error:', res.status, errText)
            return NextResponse.json({ error: 'Verification failed', valid: false }, { status: 400 })
        }

        const data = await res.json()
        const sale = data.sale

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found', valid: false }, { status: 404 })
        }

        // Check if sale is valid and not refunded
        const isValid = !sale.refunded && !sale.chargebacked && !sale.disputed
        const saleEmail = sale.email?.toLowerCase()

        // Optional: verify email matches
        if (email && saleEmail && email.toLowerCase() !== saleEmail) {
            console.warn(`[Gumroad Verify] Email mismatch: ${email} vs ${saleEmail}`)
        }

        // If sale is valid, activate VIP in auth-users.json immediately
        let updatedUser: any = null
        if (isValid && (email || saleEmail)) {
            const targetEmail = (email || saleEmail).toLowerCase()
            try {
                let users: any[] = []
                const existing = await getJsonFile(USERS_DB_FILE)
                if (Array.isArray(existing)) {
                    users = existing
                }

                const userIndex = users.findIndex((u: any) => u.email?.toLowerCase() === targetEmail)
                if (userIndex !== -1) {
                    const recurrence = sale.recurrence || 'monthly'
                    let subscriptionEnd: string
                    if (recurrence === 'yearly') {
                        subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    } else if (recurrence === 'quarterly') {
                        subscriptionEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
                    } else {
                        subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }

                    users[userIndex] = {
                        ...users[userIndex],
                        membership: 'vip',
                        subscriptionProvider: 'gumroad',
                        subscriptionId: sale.subscription_id || saleId,
                        subscriptionEnd,
                        subscriptionCancelled: false,
                        lastPaymentAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }

                    await saveJsonFile(USERS_DB_FILE, users)
                    console.log(`[Gumroad Verify] ✅ VIP activated for ${targetEmail} (until ${subscriptionEnd})`)

                    // Return updated user data (without passwordHash) for client-side sync
                    const { passwordHash, ...safeUser } = users[userIndex]
                    updatedUser = safeUser
                } else {
                    console.warn(`[Gumroad Verify] User not found: ${targetEmail}`)
                }
            } catch (dbErr: any) {
                console.error('[Gumroad Verify] DB update error:', dbErr?.message)
                // Don't fail the response - sale is still valid
            }
        }

        return NextResponse.json({
            valid: isValid,
            email: saleEmail,
            productName: sale.product_name,
            subscriptionId: sale.subscription_id,
            recurrence: sale.recurrence,
            createdAt: sale.created_at,
            refunded: sale.refunded || false,
            updatedUser, // Send back updated user data for client sync
        })
    } catch (error) {
        console.error('[Gumroad Verify] Error:', error)
        return NextResponse.json({ error: 'Internal server error', valid: false }, { status: 500 })
    }
}
