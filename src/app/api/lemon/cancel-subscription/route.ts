import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { subscriptionId } = await req.json()

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
        }

        const apiKey = process.env.LEMON_SQUEEZY_API_KEY
        if (!apiKey) {
            console.error('LEMON_SQUEEZY_API_KEY is missing')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Lemon Squeezy API: Cancel Subscription (DELETE /v1/subscriptions/:id)
        // Docs: https://docs.lemonsqueezy.com/api/subscriptions#cancel-a-subscription
        const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Lemon Squeezy Cancel Error:', errorData)
            return NextResponse.json({ error: 'Failed to cancel subscription with provider' }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error('Cancel Subscription Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
