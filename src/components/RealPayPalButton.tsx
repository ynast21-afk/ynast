'use client'

import React from 'react'
import { PayPalButtons } from '@paypal/react-paypal-js'

interface RealPayPalButtonProps {
    price: string
    planName: string
    planId?: string
    onSuccess: (details: any) => void
}

const DEFAULT_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-5NX09695H75355045NGEWJKY'

export default function RealPayPalButton({ price, planName, planId, onSuccess }: RealPayPalButtonProps) {
    const [isCapturing, setIsCapturing] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const activePlanId = planId || DEFAULT_PLAN_ID

    return (
        <div className="w-full relative z-0">
            {isCapturing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-secondary/80 backdrop-blur-[2px] rounded-xl border border-accent-primary/30">
                    <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm font-bold text-accent-primary animate-pulse">결제 처리 중...</p>
                    <p className="text-[10px] text-white/40 mt-1">창을 닫지 마세요</p>
                </div>
            )}

            {error && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    <p className="font-bold mb-1">⚠️ 결제 오류</p>
                    <p>{error}</p>
                </div>
            )}

            <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' }}
                createSubscription={(data, actions) => {
                    console.log(`Creating PayPal Subscription for ${planName} with Plan ID: ${activePlanId}`)
                    setError(null)
                    return actions.subscription.create({
                        plan_id: activePlanId
                    })
                }}
                onApprove={async (data, actions) => {
                    console.log("Subscription Approved:", data)
                    setIsCapturing(true)
                    setError(null)

                    try {
                        // Verify subscription with server
                        const verifyResponse = await fetch('/api/paypal/activate-subscription', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                subscriptionId: data.subscriptionID,
                            })
                        })

                        const verifyData = await verifyResponse.json()
                        console.log('Subscription verification:', verifyData)

                        if (verifyData.success) {
                            onSuccess({
                                subscriptionID: data.subscriptionID,
                                status: verifyData.status,
                                nextBillingTime: verifyData.nextBillingTime,
                                membership: verifyData.membership,
                            })
                        } else {
                            // Even if verification shows pending, the subscription might still be processing
                            console.warn('Subscription verification returned non-success:', verifyData)
                            onSuccess({
                                subscriptionID: data.subscriptionID,
                                status: verifyData.status || 'APPROVAL_PENDING',
                            })
                        }
                    } catch (verifyError) {
                        console.error('Subscription verification failed:', verifyError)
                        // Still notify success since PayPal approved it
                        onSuccess({
                            subscriptionID: data.subscriptionID,
                            status: 'APPROVED_PENDING_VERIFICATION',
                        })
                    } finally {
                        setIsCapturing(false)
                    }
                }}
                onCancel={() => {
                    console.log('PayPal subscription cancelled by user')
                    setError('결제가 취소되었습니다.')
                }}
                onError={(err: any) => {
                    console.error("PayPal Subscription Error:", err)
                    setIsCapturing(false)
                    setError(
                        `결제 오류가 발생했습니다.\n` +
                        `가능한 원인:\n` +
                        `1. 판매자 본인 계정으로 결제를 시도함 (본인 결제 불가)\n` +
                        `2. PayPal 비즈니스 계정 이메일 미인증\n` +
                        `3. 구독 플랜이 활성화되지 않음`
                    )
                }}
            />
        </div>
    )
}
