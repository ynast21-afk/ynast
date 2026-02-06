'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// 관리자 이메일 확인용
const ADMIN_EMAIL = 'ynast21@gmail.com'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { login } = useAuth()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (!email || !password) {
            setError('Please fill in all fields')
            setIsLoading(false)
            return
        }

        const success = await login(email, password)

        if (success) {
            // 관리자면 /admin으로, 일반 유저면 /로 리다이렉트
            if (email === ADMIN_EMAIL) {
                router.push('/admin')
            } else {
                router.push('/')
            }
        } else {
            setError('Invalid email or password')
        }

        setIsLoading(false)
    }

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="text-3xl font-bold text-accent-primary"
                        style={{ textShadow: '0 0 20px rgba(0, 255, 136, 0.5)' }}
                    >
                        kStreamer dance
                    </Link>
                    <p className="text-text-secondary mt-2">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-bg-secondary rounded-2xl p-8 border border-white/10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-text-secondary">
                                <input type="checkbox" className="mr-2 rounded border-white/20" />
                                Remember me
                            </label>
                            <Link href="#" className="text-accent-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 gradient-button text-black font-semibold rounded-xl transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-bg-secondary text-text-secondary">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                                <span>🔵</span> Google
                            </button>
                            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                                <span>🐦</span> Twitter
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-text-secondary text-sm">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-accent-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <p className="mt-6 text-center">
                    <Link href="/" className="text-text-secondary hover:text-white text-sm">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </div>
    )
}
