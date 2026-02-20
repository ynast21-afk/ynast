import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const USERS_DB_FILE = 'auth-users.json'

/**
 * Gumroad Webhook (Ping) Handler
 * 
 * Gumroad sends POST requests to this endpoint whenever:
 * - A new sale/subscription is created
 * - A subscription is cancelled
 * - A sale is refunded
 * - A subscription payment fails
 * 
 * Configure this URL in Gumroad → Settings → Advanced → Ping endpoint:
 * https://your-domain.com/api/gumroad/webhook
 */
export async function POST(request: NextRequest) {
    try {
        // Gumroad sends data as form-encoded
        const formData = await request.formData()

        const email = formData.get('email')?.toString()?.toLowerCase() || ''
        const productPermalink = formData.get('url_params[permalink]')?.toString() ||
            formData.get('product_permalink')?.toString() || ''
        const saleId = formData.get('sale_id')?.toString() || ''
        const subscriptionId = formData.get('subscription_id')?.toString() || ''
        const recurrence = formData.get('recurrence')?.toString() || '' // monthly, yearly, quarterly
        const isRefunded = formData.get('refunded')?.toString() === 'true'
        const isDisputed = formData.get('disputed')?.toString() === 'true'
        const isTest = formData.get('test')?.toString() === 'true'
        const resourceName = formData.get('resource_name')?.toString() || '' // sale, refund, dispute, cancellation, subscription_ended, subscription_restarted, subscription_updated

        console.log(`[Gumroad Webhook] Event: ${resourceName}, Email: ${email}, Sale: ${saleId}, Sub: ${subscriptionId}, Refunded: ${isRefunded}, Test: ${isTest}`)

        if (!email) {
            console.error('[Gumroad Webhook] No email in payload')
            return NextResponse.json({ error: 'No email' }, { status: 400 })
        }

        // Fetch current users directly from B2 (auth-users.json)
        let users: any[] = []
        try {
            const existing = await getJsonFile(USERS_DB_FILE)
            if (Array.isArray(existing)) {
                users = existing
            }
        } catch {
            console.error('[Gumroad Webhook] Failed to read auth-users.json from B2')
            return NextResponse.json({ error: 'DB read failed' }, { status: 500 })
        }

        const userIndex = users.findIndex((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (userIndex === -1) {
            console.log(`[Gumroad Webhook] User not found by email: ${email}, creating minimal record via webhook log only`)
            // Even if user not found, we still return success so Gumroad doesn't retry
            return NextResponse.json({ success: true, note: 'User not registered yet' })
        }

        const userData = users[userIndex]

        // Determine membership action based on event type
        const shouldActivate = !isRefunded && !isDisputed &&
            (resourceName === 'sale' || resourceName === 'subscription_restarted' || resourceName === 'subscription_updated' || resourceName === '')

        // Only subscription_ended and refund/dispute should fully deactivate
        const shouldFullDeactivate = isRefunded || isDisputed ||
            resourceName === 'subscription_ended' || resourceName === 'refund' || resourceName === 'dispute'

        // Cancellation: keep VIP until period ends (don't immediately downgrade)
        const isCancellation = resourceName === 'cancellation'

        if (shouldActivate) {
            // Calculate subscription end date based on recurrence
            let subscriptionEnd: string
            if (recurrence === 'yearly') {
                subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            } else if (recurrence === 'quarterly') {
                subscriptionEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
            } else {
                // monthly or one-time
                subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }

            users[userIndex] = {
                ...userData,
                membership: 'vip',
                subscriptionProvider: 'gumroad',
                subscriptionId: subscriptionId || saleId,
                subscriptionEnd,
                subscriptionCancelled: false,
                lastPaymentAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            console.log(`[Gumroad Webhook] ✅ Activated VIP for ${email} (until ${subscriptionEnd})`)

        } else if (isCancellation) {
            // ⚠️ CANCELLATION: Keep VIP membership until the current period ends
            // Don't downgrade to guest - let the natural expiration handle it
            users[userIndex] = {
                ...userData,
                subscriptionCancelled: true,  // Mark as cancelled (won't auto-renew)
                // membership stays 'vip' until subscriptionEnd
                updatedAt: new Date().toISOString(),
            }
            console.log(`[Gumroad Webhook] ⏸️ Subscription cancelled for ${email}. VIP maintained until ${userData.subscriptionEnd || 'period end'}`)

        } else if (shouldFullDeactivate) {
            // Full deactivation: refund, dispute, or subscription actually ended
            users[userIndex] = {
                ...userData,
                membership: 'guest',
                subscriptionCancelled: true,
                subscriptionEnd: new Date().toISOString(), // Expired now
                updatedAt: new Date().toISOString(),
            }
            console.log(`[Gumroad Webhook] ❌ Deactivated VIP for ${email} (${resourceName})`)
        }

        // Save updated users directly to B2 (auth-users.json)
        try {
            await saveJsonFile(USERS_DB_FILE, users)
            console.log(`[Gumroad Webhook] Saved updated user data to B2`)
        } catch (saveErr: any) {
            console.error('[Gumroad Webhook] Failed to save user data to B2:', saveErr?.message)
            return NextResponse.json({ error: 'Save failed' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Gumroad Webhook] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
