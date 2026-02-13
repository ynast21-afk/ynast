'use client'

import React from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import Script from 'next/script'

const faqs = [
    {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from your Gumroad account. Your access continues until the end of your billing period.',
    },
    {
        q: 'Can I change my plan?',
        a: 'Yes! You can upgrade or downgrade anytime through your Gumroad subscription settings.',
    },
    {
        q: 'What payment methods do you accept?',
        a: 'Gumroad accepts all major credit cards, debit cards, and PayPal worldwide.',
    },
    {
        q: 'Is there a free trial?',
        a: 'New members get access to 10 free videos. VIP includes full access to all premium content.',
    },
]

const GUMROAD_PRODUCT_URL = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || ''

export default function MembershipPage() {
    const { settings } = useSiteSettings()
    const { user } = useAuth()

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
        // Set wanted=true to signal "I want this"
        url.searchParams.set('wanted', 'true')
        return url.toString()
    }

    const handleSubscribe = () => {
        if (!user) {
            alert('Please login first to subscribe!')
            window.location.href = '/login'
            return
        }

        if (!GUMROAD_PRODUCT_URL) {
            alert('Payment system is being configured. Please try again later.')
            return
        }

        // Open in new tab or redirect
        window.open(buildGumroadUrl(), '_blank')
    }

    return (
        <>
            {/* Gumroad JS for overlay checkout (optional) */}
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

                            {/* Single Gumroad Subscribe Button */}
                            <button
                                onClick={handleSubscribe}
                                className="w-full py-4 rounded-xl font-bold text-xl transition-all gradient-button text-black shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                Subscribe Now
                            </button>

                            <p className="text-center text-text-secondary text-sm mt-4">
                                🔒 Secure payment via Gumroad · Cancel anytime
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
                            Gumroad supports credit cards, debit cards, PayPal, and more worldwide
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
