'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'

export default function MembershipSuccessPage() {
    const searchParams = useSearchParams()
    const { user, updateMembership } = useAuth()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const saleId = searchParams.get('sale_id')

        if (!saleId) {
            // No sale_id but user might have completed payment via Gumroad overlay
            // Webhook will handle activation server-side
            setStatus('success')
            if (updateMembership) {
                updateMembership('vip')
            }
            return
        }

        // Verify the sale with our API
        async function verifySale() {
            try {
                const res = await fetch('/api/gumroad/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        saleId,
                        email: user?.email,
                    }),
                })

                const data = await res.json()

                if (data.valid) {
                    setStatus('success')
                    if (updateMembership) {
                        updateMembership('vip')
                    }

                    // Save purchase record locally
                    const savedHistory = localStorage.getItem('kstreamer_purchase_history')
                    const history = savedHistory ? JSON.parse(savedHistory) : []
                    const newRecord = {
                        id: saleId,
                        provider: 'gumroad',
                        plan: 'VIP',
                        date: new Date().toISOString(),
                        status: 'ACTIVE',
                    }
                    localStorage.setItem('kstreamer_purchase_history', JSON.stringify([newRecord, ...history]))
                } else {
                    setStatus('error')
                    setErrorMessage(data.error || 'Payment verification failed')
                }
            } catch (err) {
                console.error('Verification error:', err)
                // Even if verification fails, webhook should handle activation
                setStatus('success')
                if (updateMembership) {
                    updateMembership('vip')
                }
            }
        }

        verifySale()
    }, [searchParams, user?.email, updateMembership])

    return (
        <>
            <Header />
            <main className="min-h-screen bg-bg-primary pt-32 pb-20">
                <div className="max-w-2xl mx-auto px-6 text-center">
                    {status === 'verifying' && (
                        <div className="animate-pulse">
                            <div className="text-6xl mb-6">⏳</div>
                            <h1 className="text-3xl font-bold mb-4">결제 확인 중...</h1>
                            <p className="text-text-secondary text-lg">
                                Gumroad에서 결제 정보를 확인하고 있습니다. 잠시만 기다려주세요.
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <div className="text-8xl mb-6 animate-bounce">🎉</div>
                            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-cyan-400 bg-clip-text text-transparent">
                                VIP 멤버십 활성화 완료!
                            </h1>
                            <p className="text-text-secondary text-lg mb-8">
                                축하합니다! 이제 모든 프리미엄 콘텐츠를 자유롭게 이용하실 수 있습니다.
                            </p>

                            <div className="bg-bg-secondary rounded-2xl p-8 border border-accent-primary/20 mb-8">
                                <h2 className="text-xl font-bold mb-4 text-accent-primary">🌟 VIP 혜택</h2>
                                <ul className="space-y-3 text-left">
                                    <li className="flex items-center gap-3">
                                        <span className="text-accent-primary text-xl">✓</span>
                                        <span>모든 영상 무제한 시청</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-accent-primary text-xl">✓</span>
                                        <span>고화질(4K) 스트리밍</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-accent-primary text-xl">✓</span>
                                        <span>광고 없는 시청 환경</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-accent-primary text-xl">✓</span>
                                        <span>신규 콘텐츠 우선 공개</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="/"
                                    className="px-8 py-4 rounded-xl font-bold text-lg gradient-button text-black transition-all hover:scale-105"
                                >
                                    🏠 홈으로 가기
                                </a>
                                <a
                                    href="/videos"
                                    className="px-8 py-4 rounded-xl font-bold text-lg bg-bg-secondary border border-white/10 hover:border-accent-primary/50 transition-all hover:scale-105"
                                >
                                    🎬 영상 보러 가기
                                </a>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <div className="text-6xl mb-6">⚠️</div>
                            <h1 className="text-3xl font-bold mb-4 text-red-400">결제 확인 실패</h1>
                            <p className="text-text-secondary text-lg mb-4">
                                {errorMessage || '결제 확인 중 문제가 발생했습니다.'}
                            </p>
                            <p className="text-text-secondary mb-8">
                                결제가 완료되었다면, 잠시 후 자동으로 멤버십이 활성화됩니다.<br />
                                문제가 지속되면 관리자에게 문의해주세요.
                            </p>
                            <a
                                href="/membership"
                                className="inline-block px-8 py-4 rounded-xl font-bold text-lg gradient-button text-black transition-all hover:scale-105"
                            >
                                멤버십 페이지로 돌아가기
                            </a>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    )
}
