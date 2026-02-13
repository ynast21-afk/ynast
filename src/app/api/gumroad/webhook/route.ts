import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

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

        // Generate a deterministic user ID from email (same as auth system)
        const userId = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)

        // Determine membership action based on event type
        const shouldActivate = !isRefunded && !isDisputed &&
            (resourceName === 'sale' || resourceName === 'subscription_restarted' || resourceName === 'subscription_updated' || resourceName === '')
        const shouldDeactivate = isRefunded || isDisputed ||
            resourceName === 'cancellation' || resourceName === 'subscription_ended' || resourceName === 'refund' || resourceName === 'dispute'

        // Load existing user data from B2
        const userDataPath = `user-data/${userId}/profile.json`
        let userData = await getJsonFile(userDataPath)

        if (!userData) {
            // User might not exist yet in B2 (registered via client-side only)
            // Create a minimal profile
            userData = {
                id: userId,
                email,
                membership: 'guest',
                createdAt: new Date().toISOString(),
            }
        }

        if (shouldActivate) {
            userData.membership = 'vip'
            userData.subscriptionProvider = 'gumroad'
            userData.subscriptionId = subscriptionId || saleId
            userData.gumroadSaleId = saleId
            userData.recurrence = recurrence
            userData.subscriptionEnd = recurrence
                ? undefined  // Recurring subscription - no fixed end date
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // One-time: 30 days
            userData.lastPaymentAt = new Date().toISOString()
            console.log(`[Gumroad Webhook] ✅ Activated VIP for ${email}`)
        } else if (shouldDeactivate) {
            userData.membership = 'guest'
            userData.subscriptionEnd = new Date().toISOString()
            console.log(`[Gumroad Webhook] ❌ Deactivated VIP for ${email} (${resourceName})`)
        }

        // Save updated user data to B2
        const saved = await saveJsonFile(userDataPath, userData)
        if (!saved) {
            console.error('[Gumroad Webhook] Failed to save user data')
            return NextResponse.json({ error: 'Save failed' }, { status: 500 })
        }

        // Also record the transaction in purchase history
        const purchasePath = `user-data/${userId}/purchases.json`
        const purchases = await getJsonFile(purchasePath) || []
        purchases.unshift({
            id: saleId,
            subscriptionId,
            provider: 'gumroad',
            event: resourceName || 'sale',
            recurrence,
            refunded: isRefunded,
            date: new Date().toISOString(),
            test: isTest,
        })
        await saveJsonFile(purchasePath, purchases.slice(0, 200))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Gumroad Webhook] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
