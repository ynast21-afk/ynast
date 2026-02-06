'use client'

import React, { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth, MembershipLevel } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import RealPayPalButton from '@/components/RealPayPalButton'

// Membership plans are now dynamically managed via SiteSettingsContext

const faqs = [
    {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from your account settings. Your access continues until the end of your billing period.',
    },
    {
        q: 'Can I change my plan?',
        a: 'Yes! Upgrade or downgrade anytime. Changes take effect on your next billing cycle.',
    },
    {
        q: 'What payment methods do you accept?',
        a: 'We accept PayPal, all major credit cards through PayPal, and cryptocurrency.',
    },
    {
        q: 'Is there a free trial?',
        a: 'New members get access to 10 free videos. VIP and Premium+ include a 7-day trial period.',
    },
]

// IMPORTANT: Replace this with your actual PayPal Sandbox Client ID
const PAYPAL_CLIENT_ID = "test" // "test" uses a default sandbox account, but strictly rate limited

export default function MembershipPage() {
    const { settings } = useSiteSettings()
    const { user, updateMembership } = useAuth()
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [showPayment, setShowPayment] = useState(false)

    // VIP Plan Data from Context
    const vipPlan = settings.pricing.vip
    const plan = {
        id: 'vip',
        name: vipPlan.title,
        price: vipPlan.monthlyPrice.toString(),
        period: 'month',
        features: vipPlan.features,
        popular: true,
        color: 'from-accent-primary to-cyan-400',
        description: vipPlan.description
    }

    const handleSelectPlan = () => {
        if (!user) {
            alert('Please login first to subscribe!')
            window.location.href = '/login'
            return
        }
        setSelectedPlan('vip')
        setShowPayment(true)
    }

    const handlePaymentSuccess = (details: any) => {
        console.log("Payment Success:", details)
        alert(`Payment completed by ${details.payer.name.given_name}`)

        if (updateMembership) {
            updateMembership('vip')
        }
        setShowPayment(false)
        setSelectedPlan(null)
    }

    return (
        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID }}>
            <Header />

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-bg-secondary w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setShowPayment(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
                        <div className="bg-black/40 p-4 rounded-xl mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-text-secondary">Plan</span>
                                <span className="font-bold">{plan.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-accent-primary font-bold text-lg">
                                <span>Total</span>
                                <span>${plan.price}/month</span>
                            </div>
                        </div>

                        <RealPayPalButton
                            price={plan.price}
                            planName={plan.name}
                            onSuccess={handlePaymentSuccess}
                        />

                        <p className="text-center text-xs text-white/30 mt-4">
                            This is a generic Sandbox environment. Use a Sandbox Account to test.
                        </p>
                    </div>
                </div>
            )}

            <main className="min-h-screen bg-bg-primary pt-32 pb-20">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Choose Your <span className="text-accent-primary">VIP Access</span>
                        </h1>
                        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                            {plan.description}
                        </p>
                    </div>

                    {/* Pricing Display - Single VIP Plan */}
                    <div className="max-w-md mx-auto mb-16">
                        <div className="relative rounded-2xl p-8 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(0,255,136,0.2)]">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-primary text-black text-sm font-bold rounded-full">
                                RECOMMENDED
                            </div>

                            <div className="text-center mb-6">
                                <h3 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-end justify-center gap-1">
                                    <span className="text-5xl font-bold">${plan.price}</span>
                                    <span className="text-text-secondary mb-1">/{plan.period}</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature: string, i: number) => (
                                    <li key={i} className="flex items-center gap-3 text-lg text-white">
                                        <span className="text-accent-primary font-bold text-xl">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={handleSelectPlan}
                                className="w-full py-4 rounded-xl font-bold text-xl transition-all gradient-button text-black shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40"
                            >
                                Get Started Now
                            </button>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                            {faqs.map((faq, i) => (
                                <div key={i} className="bg-bg-secondary rounded-xl p-6 border border-white/5">
                                    <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                                    <p className="text-text-secondary">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </PayPalScriptProvider>
    )
}
