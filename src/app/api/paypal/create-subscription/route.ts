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
        const { planId, planName, amount } = await request.json()

        const accessToken = await getAccessToken()

        // First, create or get a product
        const productResponse = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: `kStreamer dance - ${planName}`,
                description: `${planName} Membership Subscription`,
                type: 'SERVICE',
                category: 'MEDIA_AND_ENTERTAINMENT',
            }),
        })

        const product = await productResponse.json()

        // Create a billing plan
        const planResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: product.id,
                name: planName,
                description: `${planName} - Monthly Subscription`,
                billing_cycles: [
                    {
                        frequency: {
                            interval_unit: 'MONTH',
                            interval_count: 1,
                        },
                        tenure_type: 'REGULAR',
                        sequence: 1,
                        total_cycles: 0, // Infinite
                        pricing_scheme: {
                            fixed_price: {
                                value: amount,
                                currency_code: 'USD',
                            },
                        },
                    },
                ],
                payment_preferences: {
                    auto_bill_outstanding: true,
                    payment_failure_threshold: 3,
                },
            }),
        })

        const plan = await planResponse.json()

        // Create subscription
        const subscriptionResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan_id: plan.id,
                application_context: {
                    brand_name: 'kStreamer dance',
                    user_action: 'SUBSCRIBE_NOW',
                    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership/success`,
                    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership`,
                },
            }),
        })

        const subscription = await subscriptionResponse.json()

        return NextResponse.json({
            subscriptionId: subscription.id,
            approvalUrl: subscription.links?.find((l: any) => l.rel === 'approve')?.href,
        })

    } catch (error) {
        console.error('PayPal subscription error:', error)
        return NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        )
    }
}
