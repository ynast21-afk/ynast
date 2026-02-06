'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
    interface Window {
        paypal?: any
    }
}

interface PayPalButtonProps {
    planId: string
    planName: string
    amount: string
    onSuccess?: (subscriptionId: string) => void
    onError?: (error: any) => void
}

export default function PayPalButton({ planId, planName, amount, onSuccess, onError }: PayPalButtonProps) {
    const paypalRef = useRef<HTMLDivElement>(null)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Load PayPal SDK
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

        if (!clientId) {
            setError('PayPal Client ID not configured')
            return
        }

        if (document.querySelector('script[src*="paypal.com/sdk"]')) {
            setLoaded(true)
            return
        }

        const script = document.createElement('script')
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`
        script.async = true
        script.onload = () => setLoaded(true)
        script.onerror = () => setError('Failed to load PayPal SDK')
        document.body.appendChild(script)

        return () => {
            // Cleanup if needed
        }
    }, [])

    useEffect(() => {
        if (!loaded || !paypalRef.current || !window.paypal) return

        // Clear previous buttons
        paypalRef.current.innerHTML = ''

        window.paypal.Buttons({
            style: {
                shape: 'pill',
                color: 'gold',
                layout: 'vertical',
                label: 'subscribe',
            },
            createSubscription: async (data: any, actions: any) => {
                // Option 1: Use PayPal Plan ID directly (if you create plans in PayPal dashboard)
                // return actions.subscription.create({
                //   plan_id: 'P-XXXXXXXXX' // Your PayPal Plan ID
                // })

                // Option 2: Create subscription via your API
                try {
                    const response = await fetch('/api/paypal/create-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ planId, planName, amount }),
                    })
                    const { subscriptionId } = await response.json()
                    return subscriptionId
                } catch (err) {
                    console.error('Subscription creation failed:', err)
                    throw err
                }
            },
            onApprove: async (data: any) => {
                console.log('Subscription approved:', data.subscriptionID)

                // Activate subscription
                try {
                    await fetch('/api/paypal/activate-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscriptionId: data.subscriptionID }),
                    })
                    onSuccess?.(data.subscriptionID)
                } catch (err) {
                    console.error('Activation failed:', err)
                    onError?.(err)
                }
            },
            onError: (err: any) => {
                console.error('PayPal error:', err)
                setError('Payment failed. Please try again.')
                onError?.(err)
            },
            onCancel: () => {
                console.log('Payment cancelled')
            },
        }).render(paypalRef.current)
    }, [loaded, planId, planName, amount, onSuccess, onError])

    if (error) {
        return (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center">
                {error}
            </div>
        )
    }

    return (
        <div className="w-full">
            {!loaded && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                    <span className="ml-3 text-text-secondary">Loading PayPal...</span>
                </div>
            )}
            <div ref={paypalRef} className={loaded ? '' : 'hidden'} />
        </div>
    )
}
