import { NextRequest, NextResponse } from 'next/server'

/**
 * Gumroad License/Sale Verification API
 * 
 * Verifies a Gumroad purchase by checking the sale status via Gumroad API.
 * Called from the client after successful payment redirect.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { saleId, email } = body

        if (!saleId) {
            return NextResponse.json({ error: 'Missing sale ID' }, { status: 400 })
        }

        const accessToken = process.env.GUMROAD_ACCESS_TOKEN
        if (!accessToken) {
            console.error('[Gumroad Verify] GUMROAD_ACCESS_TOKEN not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Verify the sale via Gumroad API
        const res = await fetch(`https://api.gumroad.com/v2/sales/${saleId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('[Gumroad Verify] API error:', res.status, errText)
            return NextResponse.json({ error: 'Verification failed', valid: false }, { status: 400 })
        }

        const data = await res.json()
        const sale = data.sale

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found', valid: false }, { status: 404 })
        }

        // Check if sale is valid and not refunded
        const isValid = !sale.refunded && !sale.chargebacked && !sale.disputed
        const saleEmail = sale.email?.toLowerCase()

        // Optional: verify email matches
        if (email && saleEmail && email.toLowerCase() !== saleEmail) {
            console.warn(`[Gumroad Verify] Email mismatch: ${email} vs ${saleEmail}`)
        }

        return NextResponse.json({
            valid: isValid,
            email: saleEmail,
            productName: sale.product_name,
            subscriptionId: sale.subscription_id,
            recurrence: sale.recurrence,
            createdAt: sale.created_at,
            refunded: sale.refunded || false,
        })
    } catch (error) {
        console.error('[Gumroad Verify] Error:', error)
        return NextResponse.json({ error: 'Internal server error', valid: false }, { status: 500 })
    }
}
