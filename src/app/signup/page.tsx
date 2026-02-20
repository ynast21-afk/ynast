'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { signup, loginWithGoogle, isLoading: authLoading } = useAuth()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields')
            setIsLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setIsLoading(false)
            return
        }

        const success = await signup(email, password, name)

        if (success) {
            router.push('/')
        } else {
            setError('Failed to create account')
        }

        setIsLoading(false)
    }

    const handleGoogleSignup = async () => {
        const success = await loginWithGoogle()
        if (success) {
            router.push('/')
        }
    }

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
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
                    <p className="text-text-secondary mt-2">Create your account</p>
                </div>

                {/* Signup Form */}
                <div className="bg-bg-secondary rounded-2xl p-8 border border-white/10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                placeholder="Your username"
                            />
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-primary border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-start">
                            <input type="checkbox" className="mr-2 mt-1 rounded border-white/20" required />
                            <span className="text-text-secondary text-sm">
                                I agree to the{' '}
                                <Link href="/docs/terms" className="text-accent-primary hover:underline">Terms of Service</Link>
                                {' '}and{' '}
                                <Link href="/docs/privacy" className="text-accent-primary hover:underline">Privacy Policy</Link>
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || authLoading}
                            className="w-full py-3 gradient-button text-black font-semibold rounded-xl transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-bg-secondary text-text-secondary">Or sign up with</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleGoogleSignup}
                                disabled={isLoading || authLoading}
                                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-black hover:bg-white/90 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"
                                    />
                                </svg>
                                {authLoading ? 'Signing up with Google...' : 'Sign up with Google'}
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-text-secondary text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-accent-primary hover:underline font-medium">
                            Sign in
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
