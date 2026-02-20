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
        const errorData = await response.text()
        console.error('PayPal OAuth error:', response.status, errorData)
        throw new Error(`PayPal authentication failed: ${response.status}`)
    }

    const data = await response.json()
    return data.access_token
}

export async function POST(request: NextRequest) {
    try {
        const { planId, userEmail, userName } = await request.json()

        // Use the provided planId or fall back to environment variable
        const subscriptionPlanId = planId || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID

        if (!subscriptionPlanId) {
            return NextResponse.json(
                { error: 'No subscription plan ID configured' },
                { status: 400 }
            )
        }

        const accessToken = await getAccessToken()

        // Determine return/cancel URLs
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamerdance.com'

        // Create subscription using existing plan
        const subscriptionBody: any = {
            plan_id: subscriptionPlanId,
            application_context: {
                brand_name: 'kStreamer Dance',
                locale: 'ko-KR',
                user_action: 'SUBSCRIBE_NOW',
                payment_method: {
                    payer_selected: 'PAYPAL',
                    payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
                },
                return_url: `${baseUrl}/membership/success`,
                cancel_url: `${baseUrl}/membership`,
            },
        }

        // Add subscriber info if available
        if (userEmail) {
            subscriptionBody.subscriber = {
                email_address: userEmail,
                ...(userName && {
                    name: {
                        given_name: userName,
                    }
                })
            }
        }

        console.log('Creating PayPal subscription with plan:', subscriptionPlanId)
        console.log('Request body:', JSON.stringify(subscriptionBody, null, 2))

        const subscriptionResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(subscriptionBody),
        })

        const subscription = await subscriptionResponse.json()

        if (!subscriptionResponse.ok) {
            console.error('PayPal subscription creation error:', JSON.stringify(subscription, null, 2))
            return NextResponse.json(
                {
                    error: subscription.message || 'Failed to create subscription',
                    details: subscription.details || [],
                    debug_id: subscription.debug_id
                },
                { status: subscriptionResponse.status }
            )
        }

        console.log('PayPal subscription created:', subscription.id, 'Status:', subscription.status)

        const approvalUrl = subscription.links?.find((l: any) => l.rel === 'approve')?.href

        return NextResponse.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            approvalUrl,
        })

    } catch (error: any) {
        console.error('PayPal subscription error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create subscription' },
            { status: 500 }
        )
    }
}
