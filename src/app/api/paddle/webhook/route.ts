import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

// Helper: Update user membership in B2
async function updateUserMembership(email: string, membership: string, subscriptionData: any) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamerdance.com'

        // Fetch current users
        const dbRes = await fetch(`${baseUrl}/api/db?type=users`, { cache: 'no-store' })
        if (!dbRes.ok) {
            console.error('Failed to fetch users for paddle webhook')
            return false
        }

        const users = await dbRes.json()
        const userIndex = users.findIndex((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (userIndex === -1) {
            console.error(`User not found by email: ${email}`)
            return false
        }

        const user = users[userIndex]

        // Calculate subscription end (30 days from now for monthly)
        const subscriptionEnd = new Date()
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30)

        users[userIndex] = {
            ...user,
            membership,
            subscriptionId: subscriptionData.id || '',
            subscriptionProvider: 'paddle',
            subscriptionEnd: subscriptionEnd.toISOString(),
            updatedAt: new Date().toISOString()
        }

        // Save back to B2
        const saveRes = await fetch(`${baseUrl}/api/db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'users', data: users })
        })

        if (!saveRes.ok) {
            console.error('Failed to save user update')
            return false
        }

        console.log(`User ${email} membership updated to ${membership} via Paddle`)
        return true
    } catch (error) {
        console.error('Error updating user membership:', error)
        return false
    }
}

// Helper: Verify Paddle webhook signature
function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!PADDLE_WEBHOOK_SECRET || !signature) {
        // If no webhook secret configured, skip verification (for initial setup)
        console.warn('Paddle webhook secret not configured, skipping signature verification')
        return true
    }

    try {
        // Paddle signature format: ts=xxx;h1=xxx
        const parts = signature.split(';')
        const tsStr = parts.find(p => p.startsWith('ts='))?.replace('ts=', '')
        const h1Str = parts.find(p => p.startsWith('h1='))?.replace('h1=', '')

        if (!tsStr || !h1Str) return false

        const signedPayload = `${tsStr}:${rawBody}`
        const expectedSig = crypto
            .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
            .update(signedPayload)
            .digest('hex')

        const a = new Uint8Array(Buffer.from(h1Str))
        const b = new Uint8Array(Buffer.from(expectedSig))

        if (a.length !== b.length) return false

        return crypto.timingSafeEqual(a, b)
    } catch (e) {
        console.error('Webhook signature verification failed:', e)
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()
        const signature = request.headers.get('paddle-signature')

        // Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signature)) {
            console.error('Invalid Paddle webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const event = JSON.parse(rawBody)
        const eventType = event.event_type
        const data = event.data

        console.log(`Paddle webhook received: ${eventType}`, JSON.stringify(data, null, 2))

        switch (eventType) {
            case 'subscription.created':
            case 'subscription.activated': {
                // New subscription created - activate VIP
                const customerEmail = data.customer_id
                    ? await getCustomerEmail(data.customer_id)
                    : (event.data?.custom_data?.userId
                        ? await getUserEmailById(event.data.custom_data.userId)
                        : null)

                // Try to get email from the subscription or custom data
                const email = customerEmail || data.custom_data?.userEmail

                if (email) {
                    await updateUserMembership(email, 'vip', {
                        id: data.id,
                        status: data.status
                    })
                } else {
                    console.error('No email found for subscription:', data.id)
                }
                break
            }

            case 'subscription.canceled': {
                // Subscription canceled - keep VIP until end of period
                const customerEmail = data.customer_id
                    ? await getCustomerEmail(data.customer_id)
                    : null

                if (customerEmail) {
                    // Don't immediately downgrade - the scheduled_change or current_billing_period handles this
                    console.log(`Subscription ${data.id} canceled for ${customerEmail}. VIP maintained until end of period.`)

                    // If there's a scheduled change to pause/cancel, update the subscriptionEnd
                    if (data.current_billing_period?.ends_at) {
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamerdance.com'
                        const dbRes = await fetch(`${baseUrl}/api/db?type=users`, { cache: 'no-store' })
                        if (dbRes.ok) {
                            const users = await dbRes.json()
                            const userIndex = users.findIndex((u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase())
                            if (userIndex !== -1) {
                                users[userIndex].subscriptionEnd = data.current_billing_period.ends_at
                                await fetch(`${baseUrl}/api/db`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'users', data: users })
                                })
                            }
                        }
                    }
                }
                break
            }

            case 'transaction.completed': {
                console.log(`Transaction completed: ${data.id}`)
                // Payment successful - subscription is already handled by subscription.created
                break
            }

            case 'subscription.updated': {
                console.log(`Subscription updated: ${data.id}, status: ${data.status}`)
                break
            }

            default:
                console.log(`Unhandled Paddle event: ${eventType}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Paddle webhook processing error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Helper: Get customer email from Paddle API
async function getCustomerEmail(customerId: string): Promise<string | null> {
    if (!PADDLE_API_KEY) return null

    try {
        const response = await fetch(`https://api.paddle.com/customers/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${PADDLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            console.error('Failed to fetch Paddle customer:', response.status)
            return null
        }

        const result = await response.json()
        return result.data?.email || null
    } catch (e) {
        console.error('Error fetching Paddle customer:', e)
        return null
    }
}

// Helper: Get user email by userId from B2
async function getUserEmailById(userId: string): Promise<string | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamerdance.com'
        const dbRes = await fetch(`${baseUrl}/api/db?type=users`, { cache: 'no-store' })
        if (!dbRes.ok) return null

        const users = await dbRes.json()
        const user = users.find((u: any) => u.id === userId)
        return user?.email || null
    } catch {
        return null
    }
}
