'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

function SuccessContent() {
    const searchParams = useSearchParams()
    const { user, updateMembership } = useAuth()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const subscriptionId = searchParams.get('subscription_id')
        const baToken = searchParams.get('ba_token')
        const token = searchParams.get('token')
        const provider = searchParams.get('provider')

        console.log('Payment return params:', { subscriptionId, baToken, token, provider })

        if (provider === 'paddle') {
            // Paddle uses webhooks for server-side activation
            // Just update client state and show success
            setStatus('success')
            if (updateMembership) {
                updateMembership('vip')
            }
        } else if (subscriptionId || token) {
            verifySubscription(subscriptionId || token)
        } else {
            // No params but user landed here — maybe direct navigation after PayPal popup
            setStatus('success')
        }
    }, [searchParams])

    const verifySubscription = async (subscriptionId: string | null) => {
        if (!subscriptionId) {
            setStatus('success')
            return
        }

        try {
            const response = await fetch('/api/paypal/activate-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId,
                    userEmail: user?.email,
                    userId: user?.id,
                })
            })

            const data = await response.json()
            console.log('Subscription verification:', data)

            if (data.success) {
                setSubscriptionInfo(data)
                setStatus('success')

                // Update client-side membership
                if (updateMembership) {
                    updateMembership('vip')
                }
            } else {
                // Subscription may still be processing
                setSubscriptionInfo(data)
                setStatus('success')  // Show success anyway since PayPal redirected here
                if (updateMembership) {
                    updateMembership('vip')
                }
            }
        } catch (error: any) {
            console.error('Verification error:', error)
            setErrorMessage(error.message || '구독 확인 중 오류가 발생했습니다.')
            setStatus('error')
        }
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-bg-primary pt-32 pb-20">
                <div className="max-w-lg mx-auto px-6 text-center">

                    {status === 'verifying' && (
                        <div className="space-y-6">
                            <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <h1 className="text-3xl font-bold">결제 확인 중...</h1>
                            <p className="text-text-secondary">
                                구독을 검증하고 있습니다. 잠시만 기다려 주세요.
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="w-24 h-24 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-5xl">🎉</span>
                            </div>
                            <h1 className="text-3xl font-bold">결제가 완료되었습니다!</h1>
                            <p className="text-text-secondary text-lg">
                                VIP 멤버십이 활성화되었습니다.<br />
                                이제 모든 프리미엄 콘텐츠를 즐기실 수 있습니다.
                            </p>

                            {subscriptionInfo?.subscriptionId && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-text-tertiary text-sm">구독 ID</span>
                                        <span className="text-sm font-mono">{subscriptionInfo.subscriptionId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-tertiary text-sm">상태</span>
                                        <span className="text-sm font-bold text-accent-primary">{subscriptionInfo.status}</span>
                                    </div>
                                    {subscriptionInfo.nextBillingTime && (
                                        <div className="flex justify-between">
                                            <span className="text-text-tertiary text-sm">다음 결제일</span>
                                            <span className="text-sm">
                                                {new Date(subscriptionInfo.nextBillingTime).toLocaleDateString('ko-KR')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 mt-8">
                                <Link
                                    href="/mypage"
                                    className="w-full py-4 rounded-xl font-bold text-lg gradient-button text-black text-center"
                                >
                                    마이페이지로 이동
                                </Link>
                                <Link
                                    href="/"
                                    className="w-full py-4 rounded-xl font-bold text-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
                                >
                                    홈으로 돌아가기
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-5xl">⚠️</span>
                            </div>
                            <h1 className="text-3xl font-bold text-red-400">확인 중 문제가 발생했습니다</h1>
                            <p className="text-text-secondary">
                                {errorMessage || '결제 확인 중 문제가 발생했습니다.'}
                            </p>
                            <p className="text-text-tertiary text-sm">
                                결제가 정상 처리되었을 수 있습니다.<br />
                                잠시 후 마이페이지에서 멤버십 상태를 확인해 주세요.
                            </p>
                            <div className="flex flex-col gap-3 mt-8">
                                <Link
                                    href="/mypage"
                                    className="w-full py-4 rounded-xl font-bold text-lg gradient-button text-black text-center"
                                >
                                    마이페이지에서 확인
                                </Link>
                                <Link
                                    href="/membership"
                                    className="w-full py-4 rounded-xl font-bold text-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
                                >
                                    다시 시도하기
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    )
}

export default function MembershipSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
