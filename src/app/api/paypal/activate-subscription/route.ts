import { NextRequest, NextResponse } from 'next/server'
import { getJsonFile, saveJsonFile } from '@/lib/b2'

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

async function getAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal credentials not configured')
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
        throw new Error(`PayPal authentication failed: ${response.status}`)
    }

    const data = await response.json()
    return data.access_token
}

export async function POST(request: NextRequest) {
    try {
        const { subscriptionId, userEmail, userId } = await request.json()

        if (!subscriptionId) {
            return NextResponse.json(
                { error: 'Subscription ID is required' },
                { status: 400 }
            )
        }

        const accessToken = await getAccessToken()

        // Get subscription details from PayPal
        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('PayPal subscription fetch error:', errorData)
            return NextResponse.json(
                { error: 'Failed to fetch subscription details', details: errorData },
                { status: response.status }
            )
        }

        const subscription = await response.json()

        console.log('PayPal subscription status:', subscription.status)
        console.log('Subscriber:', subscription.subscriber?.email_address)

        // Check if subscription is active
        if (subscription.status === 'ACTIVE') {
            // Update user's membership in B2 storage
            const email = userEmail || subscription.subscriber?.email_address

            if (email) {
                try {
                    const usersData = await getJsonFile('auth-users.json') || []
                    const userIndex = usersData.findIndex((u: any) => u.email === email)

                    if (userIndex !== -1) {
                        usersData[userIndex].membership = 'vip'
                        usersData[userIndex].subscriptionId = subscriptionId
                        usersData[userIndex].subscriptionProvider = 'paypal'

                        // Set subscription end date from billing info
                        if (subscription.billing_info?.next_billing_time) {
                            usersData[userIndex].subscriptionEnd = subscription.billing_info.next_billing_time
                        } else {
                            // Default to 30 days from now
                            usersData[userIndex].subscriptionEnd = new Date(
                                Date.now() + 30 * 24 * 60 * 60 * 1000
                            ).toISOString()
                        }

                        await saveJsonFile('auth-users.json', usersData)
                        console.log(`User ${email} upgraded to VIP via PayPal subscription ${subscriptionId}`)
                    } else {
                        console.warn(`User ${email} not found in auth-users.json`)
                    }
                } catch (dbError) {
                    console.error('Failed to update user membership in B2:', dbError)
                    // Don't fail the response - subscription is still active
                }
            }

            return NextResponse.json({
                success: true,
                status: subscription.status,
                subscriptionId: subscription.id,
                subscriberEmail: subscription.subscriber?.email_address,
                nextBillingTime: subscription.billing_info?.next_billing_time,
                membership: 'vip',
            })
        }

        // Subscription not active
        return NextResponse.json({
            success: false,
            status: subscription.status,
            message: `Subscription status is ${subscription.status}. Expected ACTIVE.`,
        })

    } catch (error: any) {
        console.error('PayPal activation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to activate subscription' },
            { status: 500 }
        )
    }
}
