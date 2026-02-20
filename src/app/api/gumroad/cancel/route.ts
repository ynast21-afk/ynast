import { NextRequest, NextResponse } from 'next/server'

const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN

/**
 * Gumroad Subscription Cancel API
 * 
 * Cancels a Gumroad subscription via the Gumroad API.
 * The subscription will remain active until the end of the current billing period.
 */
export async function POST(request: NextRequest) {
    try {
        if (!GUMROAD_ACCESS_TOKEN) {
            console.error('[Gumroad Cancel] API token not configured')
            return NextResponse.json(
                {
                    error: '자동 결제 해지를 처리할 수 없습니다. 관리자에게 문의해 주세요.',
                    errorCode: 'API_NOT_CONFIGURED',
                    supportEmail: 'ynast21@gmail.com'
                },
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

        // Cancel the subscription via Gumroad API
        // Gumroad API: PUT /v2/subscribers/{id} with cancelled=true
        const response = await fetch(`https://api.gumroad.com/v2/subscribers/${subscriptionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                access_token: GUMROAD_ACCESS_TOKEN,
                cancelled: 'true',
            }).toString(),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Gumroad Cancel] API error:', response.status, errorText)
            return NextResponse.json(
                { error: 'Failed to cancel Gumroad subscription' },
                { status: response.status }
            )
        }

        const result = await response.json()

        console.log(`[Gumroad Cancel] Subscription ${subscriptionId} cancelled. Reason: ${reason || 'Not specified'}`)

        // Also update user record in B2 to mark as cancelled (keep VIP until period ends)
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kstreamerdance.com'
            const dbRes = await fetch(`${baseUrl}/api/db?type=users`, { cache: 'no-store' })
            if (dbRes.ok) {
                const users = await dbRes.json()
                const userIndex = users.findIndex((u: any) =>
                    u.subscriptionId === subscriptionId && u.subscriptionProvider === 'gumroad'
                )
                if (userIndex !== -1) {
                    users[userIndex].subscriptionCancelled = true
                    users[userIndex].updatedAt = new Date().toISOString()
                    await fetch(`${baseUrl}/api/db`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'users', data: users })
                    })
                }
            }
        } catch (e) {
            console.error('[Gumroad Cancel] Failed to update B2 record:', e)
            // Don't fail the response - the Gumroad cancellation was successful
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscriber: result.subscriber,
        })

    } catch (error: any) {
        console.error('[Gumroad Cancel] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        )
    }
}
