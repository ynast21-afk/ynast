'use client'

import { useEffect, useState } from 'react'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

interface PaddleCheckoutButtonProps {
    userEmail?: string
    userId?: string
    onSuccess?: () => void
}

export default function PaddleCheckoutButton({ userEmail, userId, onSuccess }: PaddleCheckoutButtonProps) {
    const [paddle, setPaddle] = useState<Paddle | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production' || 'production'

        if (!clientToken) {
            setError('Paddle client token not configured')
            setLoading(false)
            return
        }

        initializePaddle({
            token: clientToken,
            environment,
            eventCallback: (event) => {
                if (event.name === 'checkout.completed') {
                    console.log('Paddle checkout completed:', event.data)
                    // Webhook will handle the server-side update
                    // Client-side callback for UI update
                    onSuccess?.()
                }
                if (event.name === 'checkout.closed') {
                    console.log('Paddle checkout closed')
                }
                if (event.name === 'checkout.error') {
                    console.error('Paddle checkout error:', event.data)
                    setError('Payment processing error. Please try again.')
                }
            }
        }).then((paddleInstance) => {
            if (paddleInstance) {
                setPaddle(paddleInstance)
            } else {
                setError('Failed to initialize payment system')
            }
            setLoading(false)
        }).catch((err) => {
            console.error('Paddle initialization error:', err)
            setError('Failed to load payment system')
            setLoading(false)
        })
    }, [onSuccess])

    const handleCheckout = () => {
        if (!paddle) {
            setError('Payment system not ready. Please refresh the page.')
            return
        }

        const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
        if (!priceId) {
            setError('Payment plan not configured')
            return
        }

        setError(null)

        paddle.Checkout.open({
            items: [{ priceId, quantity: 1 }],
            settings: {
                displayMode: 'overlay',
                theme: 'dark',
                locale: 'ko',
                successUrl: `${window.location.origin}/membership/success?provider=paddle`,
            },
            customer: userEmail ? { email: userEmail } : undefined,
            customData: userId ? { userId } : undefined,
        })
    }

    return (
        <div className="w-full">
            <button
                onClick={handleCheckout}
                disabled={loading || !paddle}
                className="w-full py-4 rounded-xl font-bold text-xl transition-all bg-[#4A90D9] hover:bg-[#3A7BC8] text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                    </span>
                ) : (
                    <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        Subscribe with Card (Paddle)
                    </>
                )}
            </button>
            {error && (
                <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}
        </div>
    )
}
