'use client'

import React, { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import PaddleCheckoutButton from '@/components/PaddleCheckoutButton'
import RealPayPalButton from '@/components/RealPayPalButton'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import Script from 'next/script'

const faqs = [
    {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from your PayPal, Paddle, or Gumroad account. Your access continues until the end of your billing period.',
    },
    {
        q: 'Can I change my plan?',
        a: 'Yes! You can upgrade or downgrade anytime through your subscription settings.',
    },
    {
        q: 'What payment methods do you accept?',
        a: 'We accept PayPal subscriptions, credit/debit cards via Paddle, and Gumroad payments worldwide.',
    },
    {
        q: 'Is there a free trial?',
        a: 'New members get access to 10 free videos. VIP includes full access to all premium content.',
    },
]

const GUMROAD_PRODUCT_URL = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || ''
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

export default function MembershipPage() {
    const { settings } = useSiteSettings()
    const { user, updateMembership } = useAuth()
    const [showPayPal, setShowPayPal] = useState(false)

    // VIP Plan Data from Context
    const vipPlan = settings.pricing.vip
    const plan = {
        id: 'vip',
        name: vipPlan.title,
        price: vipPlan.monthlyPrice.toString(),
        period: 'month',
        features: vipPlan.features,
        description: vipPlan.description
    }

    // Build Gumroad URL with user info for auto-fill
    const buildGumroadUrl = () => {
        const url = new URL(GUMROAD_PRODUCT_URL || 'https://gumroad.com')
        if (user?.email) {
            url.searchParams.set('email', user.email)
        }
        url.searchParams.set('wanted', 'true')
        return url.toString()
    }

    const handleGumroadSubscribe = () => {
        if (!user) {
            alert('Please login first to subscribe!')
            window.location.href = '/login'
            return
        }
        if (!GUMROAD_PRODUCT_URL) {
            alert('Payment system is being configured. Please try again later.')
            return
        }
        window.open(buildGumroadUrl(), '_blank')
    }

    const handlePayPalSuccess = (details: any) => {
        console.log('PayPal subscription success:', details)
        if (updateMembership) {
            updateMembership('vip')
        }
        // Record purchase
        const savedHistory = localStorage.getItem('kstreamer_purchase_history')
        const history = savedHistory ? JSON.parse(savedHistory) : []
        const newRecord = {
            id: details.subscriptionID,
            provider: 'paypal',
            plan: 'VIP',
            date: new Date().toISOString(),
            status: 'ACTIVE',
        }
        localStorage.setItem('kstreamer_purchase_history', JSON.stringify([newRecord, ...history]))
        window.location.href = '/membership/success?provider=paypal'
    }

    return (
        <>
            {/* Gumroad JS for overlay checkout */}
            <Script src="https://gumroad.com/js/gumroad.js" strategy="lazyOnload" />

            <Header />

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
                                <h3 className="text-3xl font-bold mb-2 text-white">
                                    VIP PLAN
                                </h3>
                                <div className="flex items-end justify-center gap-1">
                                    <span className="text-5xl font-bold">${plan.price}</span>
                                    <span className="text-text-secondary mb-1">/{plan.period}</span>
                                </div>
                                <div className="text-sm text-accent-primary mt-2">or ${(parseFloat(plan.price) * 10).toFixed(2)}/year (Save ~20%)</div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature: string, i: number) => (
                                    <li key={i} className="flex items-center gap-3 text-lg text-white">
                                        <span className="text-accent-primary font-bold text-xl">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* Payment Buttons */}
                            <div className="space-y-3">
                                {/* 1. Gumroad Payment */}
                                <button
                                    onClick={handleGumroadSubscribe}
                                    className="w-full py-4 rounded-xl font-bold text-xl transition-all bg-[#FF90E8] hover:bg-[#ff6bde] text-black shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    Subscribe with Gumroad
                                </button>

                                {/* 2. Paddle Card Payment */}
                                <PaddleCheckoutButton
                                    userEmail={user?.email}
                                    userId={user?.id}
                                    onSuccess={() => {
                                        if (updateMembership) updateMembership('vip')
                                        alert('🎉 VIP 멤버십이 성공적으로 활성화되었습니다!')
                                        window.location.href = '/membership/success?provider=paddle'
                                    }}
                                />

                                {/* 3. PayPal Subscription */}
                                {!showPayPal ? (
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                alert('Please login first to subscribe!')
                                                window.location.href = '/login'
                                                return
                                            }
                                            setShowPayPal(true)
                                        }}
                                        className="w-full py-4 rounded-xl font-bold text-xl transition-all bg-[#FFC439] hover:bg-[#f0b429] text-[#003087] shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.765.765 0 0 1 .757-.643h6.568c2.183 0 3.708.563 4.533 1.672.793 1.065.95 2.397.467 3.96l-.015.05v.457l.356.18c.29.14.522.301.7.486.375.39.613.882.707 1.462.097.594.048 1.284-.145 2.05-.223.882-.583 1.648-1.07 2.28a4.462 4.462 0 0 1-1.614 1.378c-.6.33-1.28.558-2.028.679-.728.117-1.525.176-2.37.176H11.6a.937.937 0 0 0-.627.238.926.926 0 0 0-.31.59l-.03.168-.488 3.09-.022.12a.926.926 0 0 1-.31.59.937.937 0 0 1-.626.238h-.111z" />
                                        </svg>
                                        Subscribe with PayPal
                                    </button>
                                ) : (
                                    <div className="bg-white/5 rounded-xl p-4 border border-[#FFC439]/30">
                                        <p className="text-sm text-text-secondary mb-3 text-center">PayPal로 구독하기</p>
                                        {PAYPAL_CLIENT_ID ? (
                                            <PayPalScriptProvider options={{
                                                clientId: PAYPAL_CLIENT_ID,
                                                vault: true,
                                                intent: 'subscription',
                                            }}>
                                                <RealPayPalButton
                                                    price={plan.price}
                                                    planName={plan.name}
                                                    onSuccess={handlePayPalSuccess}
                                                />
                                            </PayPalScriptProvider>
                                        ) : (
                                            <p className="text-red-400 text-sm text-center">PayPal is not configured yet.</p>
                                        )}
                                        <button
                                            onClick={() => setShowPayPal(false)}
                                            className="w-full mt-2 text-sm text-text-secondary hover:text-white transition-colors"
                                        >
                                            ← Back to payment options
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-text-secondary text-sm mt-4">
                                🔒 Secure payment via Gumroad, Paddle, or PayPal · Cancel anytime
                            </p>
                        </div>
                    </div>

                    {/* Payment Methods Info */}
                    <div className="max-w-md mx-auto mb-16 text-center">
                        <p className="text-text-secondary text-sm mb-3">Accepted Payment Methods</p>
                        <div className="flex items-center justify-center gap-4 text-2xl opacity-60">
                            <span title="Visa">💳</span>
                            <span title="Mastercard">💳</span>
                            <span title="PayPal">🅿️</span>
                            <span title="Apple Pay">🍎</span>
                            <span title="Google Pay">🤖</span>
                        </div>
                        <p className="text-text-secondary text-xs mt-2">
                            Multiple payment options available worldwide
                        </p>
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
        </>
    )
}
