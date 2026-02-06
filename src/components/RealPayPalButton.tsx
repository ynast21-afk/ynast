'use client'

import React from 'react'
import { PayPalButtons } from '@paypal/react-paypal-js'

interface RealPayPalButtonProps {
    price: string
    planName: string
    onSuccess: (details: any) => void
}

export default function RealPayPalButton({ price, planName, onSuccess }: RealPayPalButtonProps) {
    return (
        <div className="w-full relative z-0">
            <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                createOrder={(data, actions) => {
                    console.log("Creating PayPal Order for", planName, price);
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
                    console.log("Order Approved:", data);
                    if (actions.order) {
                        try {
                            const details = await actions.order.capture()
                            console.log("Order Captured:", details);
                            onSuccess(details)
                        } catch (err) {
                            console.error("Capture Error:", err);
                            alert("Payment capture failed. check console.")
                        }
                    }
                }}
                onError={(err: any) => {
                    console.error("PayPal Checkout onError", err)
                    const errorMessage = err?.message || JSON.stringify(err)
                    // Show a specific alert so we know this component is active
                    alert(`[New Wrapper] PayPal Error: ${errorMessage}\n\nCheck Client ID!`)
                }}
            />
        </div>
    )
}
