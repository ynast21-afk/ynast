'use client'

import React from 'react'
import { PayPalButtons } from '@paypal/react-paypal-js'

interface PayPalIntegrationProps {
    price: string
    planName: string
    onSuccess: (details: any) => void
}

export default function PayPalIntegration({ price, planName, onSuccess }: PayPalIntegrationProps) {
    return (
        <div className="w-full">
            <PayPalButtons
                style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                createOrder={(data, actions) => {
                    return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                            {
                                description: `kStreamer ${planName} Membership`,
                                amount: {
                                    currency_code: "USD",
                                    value: price,
                                },
                            },
                        ],
                    })
                }}
                onApprove={async (data, actions) => {
                    if (actions.order) {
                        const details = await actions.order.capture()
                        onSuccess(details)
                    }
                }}
                onError={(err: any) => {
                    console.error("PayPal Checkout onError", err)
                    // Payer Action Required: Detailed error for debugging
                    const errorMessage = err?.message || JSON.stringify(err)
                    alert(`PayPal Error: ${errorMessage}\n\nTip: You might need a real Sandbox Client ID.`)
                }}
            />
        </div>
    )
}
