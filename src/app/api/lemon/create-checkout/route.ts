import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { variantId, userEmail, userName, userId } = await req.json()

        if (!variantId) {
            return NextResponse.json({ error: 'Variant ID is required' }, { status: 400 })
        }

        const apiKey = process.env.LEMON_SQUEEZY_API_KEY
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID

        if (!apiKey || !storeId) {
            console.error('Lemon Squeezy credentials missing:', {
                hasApiKey: !!apiKey,
                hasStoreId: !!storeId
            })
            const missing = !apiKey && !storeId ? 'API Key and Store ID' : !apiKey ? 'API Key' : 'Store ID'
            return NextResponse.json({ error: `Server configuration error: Missing ${missing}` }, { status: 500 })
        }

        // Lemon Squeezy API: Create Checkout
        // Docs: https://docs.lemonsqueezy.com/api/checkouts#create-a-checkout
        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            email: userEmail || '',
                            name: userName || '',
                            custom: {
                                user_id: userId || ''
                            }
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: storeId.toString()
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: variantId.toString()
                            }
                        }
                    }
                }
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Lemon Squeezy API Error:', JSON.stringify(errorData, null, 2))
            const errorMessage = errorData.errors?.[0]?.title || errorData.errors?.[0]?.detail || 'Failed to create checkout'
            return NextResponse.json({ error: errorMessage, details: errorData }, { status: response.status })
        }

        const { data } = await response.json()
        return NextResponse.json({ checkoutUrl: data.attributes.url })

    } catch (error) {
        console.error('Checkout Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
