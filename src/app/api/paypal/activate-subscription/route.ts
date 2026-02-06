import { NextRequest, NextResponse } from 'next/server'

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

async function getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })

    const data = await response.json()
    return data.access_token
}

export async function POST(request: NextRequest) {
    try {
        const { subscriptionId } = await request.json()

        const accessToken = await getAccessToken()

        // Get subscription details
        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        const subscription = await response.json()

        // Check if subscription is active
        if (subscription.status === 'ACTIVE') {
            // TODO: Update user's membership in database
            // await db.user.update({
            //   where: { id: userId },
            //   data: { 
            //     membership: 'VIP',
            //     subscriptionId: subscriptionId,
            //     subscriptionEnd: new Date(subscription.billing_info.next_billing_time)
            //   }
            // })

            return NextResponse.json({
                success: true,
                status: subscription.status,
                nextBillingTime: subscription.billing_info?.next_billing_time,
            })
        }

        return NextResponse.json({
            success: false,
            status: subscription.status,
        })

    } catch (error) {
        console.error('PayPal activation error:', error)
        return NextResponse.json(
            { error: 'Failed to activate subscription' },
            { status: 500 }
        )
    }
}
