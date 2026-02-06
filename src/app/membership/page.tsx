'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PayPalButton from '@/components/PayPalButton'

// Note: metadata는 'use client' 컴포넌트에서 직접 export 불가
// layout.tsx의 template 패턴으로 타이틀이 자동 적용됨

const plans = [
    {
        id: 'basic',
        name: 'Basic',
        price: '9.99',
        period: 'month',
        features: [
            'HD Streaming',
            '100+ Dance Videos',
            'Mobile Access',
            'New Weekly Content',
        ],
        popular: false,
        color: 'from-gray-600 to-gray-700',
    },
    {
        id: 'vip',
        name: 'VIP',
        price: '19.99',
        period: 'month',
        features: [
            'Full HD Streaming',
            '500+ Dance Videos',
            'Download Access',
            'Exclusive Content',
            'Early Access',
            'No Ads',
        ],
        popular: true,
        color: 'from-accent-primary to-cyan-400',
    },
    {
        id: 'premium',
        name: 'Premium+',
        price: '39.99',
        period: 'month',
        features: [
            '4K Ultra HD',
            'All Videos Access',
            'Unlimited Downloads',
            'Behind the Scenes',
            'Creator Chat Access',
            'Custom Playlists',
            'Priority Support',
        ],
        popular: false,
        color: 'from-accent-secondary to-purple-500',
    },
]

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

export default function MembershipPage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [showPayment, setShowPayment] = useState(false)

    const handleSelectPlan = (planId: string) => {
        setSelectedPlan(planId)
        setShowPayment(true)
    }

    const handlePaymentSuccess = (subscriptionId: string) => {
        alert(`🎉 Payment successful! Subscription ID: ${subscriptionId}`)
        setShowPayment(false)
        // TODO: Redirect to success page or update UI
    }

    const selectedPlanData = plans.find(p => p.id === selectedPlan)

    return (
        <>
            <Header />
            <main className="min-h-screen bg-bg-primary pt-32 pb-20">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Choose Your <span className="text-accent-primary">VIP Access</span>
                        </h1>
                        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                            Unlock premium dance content with exclusive access to the best streams and downloads.
                        </p>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${plan.popular
                                    ? 'bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary'
                                    : 'bg-bg-secondary border border-white/10'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-primary text-black text-sm font-bold rounded-full">
                                        MOST POPULAR
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className={`text-2xl font-bold mb-2 bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-end justify-center gap-1">
                                        <span className="text-4xl font-bold">${plan.price}</span>
                                        <span className="text-text-secondary mb-1">/{plan.period}</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-text-secondary">
                                            <span className="text-accent-primary">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    className={`w-full py-3 rounded-full font-semibold transition-all ${plan.popular
                                        ? 'gradient-button text-black'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    Select {plan.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Payment Modal */}
                    {showPayment && selectedPlanData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                            <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold">Complete Payment</h2>
                                    <button
                                        onClick={() => setShowPayment(false)}
                                        className="text-text-secondary hover:text-white text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="bg-bg-primary rounded-xl p-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">Plan</span>
                                        <span className="font-semibold">{selectedPlanData.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-text-secondary">Price</span>
                                        <span className="font-semibold text-accent-primary">${selectedPlanData.price}/month</span>
                                    </div>
                                </div>

                                <PayPalButton
                                    planId={selectedPlanData.id}
                                    planName={selectedPlanData.name}
                                    amount={selectedPlanData.price}
                                    onSuccess={handlePaymentSuccess}
                                    onError={(err) => console.error('Payment error:', err)}
                                />

                                <p className="text-xs text-text-secondary text-center mt-4">
                                    By subscribing, you agree to our Terms of Service and Privacy Policy.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* FAQ Section */}
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-10">
                            Frequently Asked <span className="text-accent-primary">Questions</span>
                        </h2>
                        <div className="space-y-4">
                            {faqs.map((faq, i) => (
                                <div key={i} className="bg-bg-secondary rounded-xl p-6 border border-white/10">
                                    <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                                    <p className="text-text-secondary">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-16 p-10 rounded-2xl bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30">
                        <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
                        <p className="text-text-secondary mb-6">
                            Our support team is here to help 24/7
                        </p>
                        <Link
                            href="#"
                            className="inline-block px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
                        >
                            Contact Support
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
