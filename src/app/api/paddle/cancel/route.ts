import { NextRequest, NextResponse } from 'next/server'

const PADDLE_API_KEY = process.env.PADDLE_API_KEY

export async function POST(request: NextRequest) {
    try {
        if (!PADDLE_API_KEY) {
            return NextResponse.json(
                { error: 'Paddle API key not configured' },
                { status: 500 }
            )
        }

        const { subscriptionId, reason } = await request.json()

        if (!subscriptionId) {
            return NextResponse.json(
                { error: 'Subscription ID is required' },
                { status: 400 }
            )
        }

        // Cancel the subscription at end of billing period (not immediately)
        const response = await fetch(`https://api.paddle.com/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PADDLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                effective_from: 'next_billing_period' // Keep VIP until period ends
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Paddle cancel error:', errorData)
            return NextResponse.json(
                { error: errorData.error?.detail || 'Failed to cancel subscription' },
                { status: response.status }
            )
        }

        const result = await response.json()

        console.log(`Paddle subscription ${subscriptionId} canceled. Reason: ${reason || 'Not specified'}`)

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            scheduledChangeDate: result.data?.current_billing_period?.ends_at
        })

    } catch (error: any) {
        console.error('Paddle cancel error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        )
    }
}
