'use client'

import { useState, useEffect } from 'react'

interface PaymentSimulationModalProps {
    isOpen: boolean
    onClose: () => void
    planName: string
    price: string
    onSuccess: () => void
}

export default function PaymentSimulationModal({
    isOpen,
    onClose,
    planName,
    price,
    onSuccess,
}: PaymentSimulationModalProps) {
    const [step, setStep] = useState<'details' | 'processing' | 'success'>('details')

    useEffect(() => {
        if (isOpen) {
            setStep('details')
        }
    }, [isOpen])

    const handlePayment = () => {
        setStep('processing')

        // 2초 후 결제 성공 처리
        setTimeout(() => {
            setStep('success')
            // 1.5초 후 성공 콜백 및 모달 닫기
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
        }, 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={step !== 'processing' ? onClose : undefined}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-bg-secondary border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden">
                {/* Close Button */}
                {step !== 'processing' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-text-secondary hover:text-white"
                    >
                        ✕
                    </button>
                )}

                {/* Step 1: Payment Details */}
                {step === 'details' && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-center">Checkout</h2>

                        <div className="bg-bg-primary rounded-xl p-4 mb-6 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-text-secondary">Plan</span>
                                <span className="text-xl font-bold text-accent-primary">{planName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Total</span>
                                <span className="text-2xl font-bold">${price}</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-bg-primary p-4 rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer ring-1 ring-accent-primary">
                                <span className="text-2xl">💳</span>
                                <div>
                                    <p className="font-semibold">Test Card</p>
                                    <p className="text-xs text-text-secondary">**** **** **** 4242</p>
                                </div>
                                <div className="ml-auto w-4 h-4 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,255,136,0.5)]" />
                            </div>
                        </div>

                        <button
                            onClick={handlePayment}
                            className="w-full py-4 rounded-xl font-bold text-lg bg-accent-primary text-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                        >
                            Pay ${price}
                        </button>

                        <p className="text-xs text-center text-text-secondary mt-4">
                            This is a simulation mode. No real money will be charged.
                        </p>
                    </div>
                )}

                {/* Step 2: Processing */}
                {step === 'processing' && (
                    <div className="py-10 text-center animate-fade-in">
                        <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-xl font-bold mb-2">Processing Payment...</h3>
                        <p className="text-text-secondary">Please do not close this window.</p>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                    <div className="py-10 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-accent-primary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_30px_rgba(0,255,136,0.5)]">
                            ✓
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Payment Successful!</h3>
                        <p className="text-text-secondary">Welcome to {planName} membership.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
