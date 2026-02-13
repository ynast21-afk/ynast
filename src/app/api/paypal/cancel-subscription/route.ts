import { NextRequest, NextResponse } from 'next/server'

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
        const { subscriptionId, reason } = await request.json()

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
        }

        const accessToken = await getAccessToken()

        // Call PayPal to cancel the subscription
        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reason: reason || 'User requested cancellation'
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('PayPal cancel error details:', errorData)
            throw new Error(errorData.message || 'Failed to cancel subscription with PayPal')
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription cancelled successfully'
        })

    } catch (error: any) {
        console.error('PayPal cancellation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        )
    }
}
