'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'

const plans = [
    {
        name: 'Basic',
        price: '$0',
        period: '/month',
        features: [
            { text: 'Limited video previews', enabled: true },
            { text: 'SD quality streaming', enabled: true },
            { text: 'Basic search', enabled: true },
            { text: 'Download access', enabled: false },
            { text: 'Ad-free experience', enabled: false },
            { text: 'HD/4K quality', enabled: false },
        ],
        buttonText: 'Get Started',
        buttonStyle: 'outline',
        popular: false,
        accent: 'gray',
    },
    {
        name: 'VIP',
        price: '$19.99',
        period: '/month',
        features: [
            { text: 'Unlimited video access', enabled: true },
            { text: 'HD quality streaming', enabled: true },
            { text: 'Download for offline', enabled: true },
            { text: 'Ad-free experience', enabled: true },
            { text: 'Priority support', enabled: true },
            { text: '4K Ultra HD', enabled: false },
        ],
        buttonText: 'Subscribe Now',
        buttonStyle: 'gradient',
        popular: true,
        accent: 'primary',
    },
    {
        name: 'Premium+',
        price: '$49.99',
        period: '/month',
        features: [
            { text: 'Everything in VIP', enabled: true },
            { text: '4K Ultra HD quality', enabled: true },
            { text: 'Early access content', enabled: true },
            { text: 'Exclusive releases', enabled: true },
            { text: 'Priority support 24/7', enabled: true },
            { text: 'Creator chat access', enabled: true },
        ],
        buttonText: 'Go Premium',
        buttonStyle: 'secondary',
        popular: false,
        accent: 'secondary',
    },
]

const faqs = [
    {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes! You can cancel your subscription at any time. Your access will continue until the end of your billing period.'
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, PayPal, and cryptocurrency (Bitcoin, Ethereum, USDT).'
    },
    {
        question: 'Can I download videos for offline viewing?',
        answer: 'VIP and Premium+ members can download videos for offline viewing on any device.'
    },
    {
        question: 'Is there a free trial available?',
        answer: 'New users can enjoy a 7-day free trial of VIP membership. No credit card required to start.'
    },
]

export default function MembershipPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            {/* Spacer for fixed header */}
            <div className="h-[72px]" />

            {/* Hero */}
            <section className="text-center py-16 px-6">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
                    Choose Your Plan
                </h1>
                <p className="text-xl text-text-secondary max-w-xl mx-auto">
                    Unlock unlimited access to premium content from top creators worldwide
                </p>
            </section>

            {/* Pricing Cards */}
            <section className="px-6 pb-16">
                <div className="flex flex-col lg:flex-row justify-center gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={plan.name}
                            className={`
                relative bg-bg-secondary rounded-2xl p-8 w-full lg:w-[340px]
                transition-transform hover:-translate-y-2
                ${plan.popular ? 'glow-border scale-105 z-10' : 'border-2 border-text-secondary/30'}
                ${plan.accent === 'secondary' ? 'border-accent-secondary shadow-[0_0_30px_rgba(255,0,255,0.2)]' : ''}
              `}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-primary text-black px-5 py-2 rounded-full text-xs font-bold uppercase">
                                    ⭐ Most Popular
                                </span>
                            )}

                            <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                            <div className="text-5xl font-bold mb-1">
                                {plan.price}
                                <span className="text-base text-text-secondary font-normal">{plan.period}</span>
                            </div>

                            {/* Features */}
                            <ul className="my-8 space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li
                                        key={i}
                                        className={`flex items-center gap-3 py-3 border-b border-white/10 ${!feature.enabled ? 'text-text-secondary line-through' : ''
                                            }`}
                                    >
                                        <span className={feature.enabled ? 'text-accent-primary' : 'text-red-500'}>
                                            {feature.enabled ? '✓' : '✗'}
                                        </span>
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>

                            {/* Button */}
                            <button
                                className={`
                  w-full py-4 rounded-full font-semibold text-base transition-all
                  ${plan.buttonStyle === 'gradient'
                                        ? 'gradient-button text-black animate-pulse-glow'
                                        : plan.buttonStyle === 'secondary'
                                            ? 'bg-accent-secondary text-white hover:shadow-[0_0_30px_rgba(255,0,255,0.5)]'
                                            : 'border-2 border-text-secondary text-white hover:border-accent-primary hover:text-accent-primary'
                                    }
                `}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Payment Methods */}
            <section className="text-center py-12 px-6">
                <h3 className="text-xl text-text-secondary mb-8">Secure Payment Methods</h3>
                <div className="flex justify-center gap-8 mb-6">
                    <div className="w-20 h-12 bg-bg-secondary rounded-lg flex items-center justify-center text-2xl">
                        💳
                    </div>
                    <div className="w-20 h-12 bg-[#003087] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        PayPal
                    </div>
                    <div className="w-20 h-12 bg-bg-secondary rounded-lg flex items-center justify-center text-2xl">
                        ₿
                    </div>
                    <div className="w-20 h-12 bg-bg-secondary rounded-lg flex items-center justify-center text-2xl">
                        🔐
                    </div>
                </div>
                <p className="text-sm text-text-secondary">
                    🔒 Secure payment powered by <span className="text-accent-primary">PayPal</span> & Stripe
                </p>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto py-12 px-6">
                <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-bg-secondary rounded-xl overflow-hidden">
                            <button
                                className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-bg-tertiary transition-colors"
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            >
                                <span className="font-medium">{faq.question}</span>
                                <span className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>
                            {openFaq === index && (
                                <div className="px-6 pb-5 text-text-secondary">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <Footer />
        </div>
    )
}
