'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSiteSettings } from './SiteSettingsContext'

// Admin email for client-side UI checks only (actual auth happens server-side)
const ADMIN_EMAIL = 'ynast21@gmail.com'

export type MembershipLevel = 'guest' | 'basic' | 'vip' | 'premium'
export type UserRole = 'user' | 'moderator' | 'admin'

export interface User {
    id: string
    email: string
    name: string
    membership: MembershipLevel
    role: UserRole
    avatar?: string
    subscriptionId?: string
    subscriptionProvider?: 'gumroad' | 'paypal' | 'paddle' | 'lemon' | string
    subscriptionEnd?: string
    subscriptionCancelled?: boolean
    subscriptionCancelledAt?: string
    isBanned: boolean
    banReason?: string
    createdAt: string
    lastLoginAt?: string
    emailVerified: boolean
    provider?: 'email' | 'google'
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAdmin: boolean
    adminToken: string | null
    getAdminHeaders: () => Record<string, string>
    login: (email: string, password: string) => Promise<boolean>
    signup: (email: string, password: string, name: string) => Promise<boolean>
    logout: () => void
    updateMembership: (level: MembershipLevel) => void
    updateUserRole: (userId: string, role: UserRole) => void
    banUser: (userId: string, reason: string) => void
    unbanUser: (userId: string) => void
    verifyEmail: () => void
    loginWithGoogle: () => Promise<boolean>
    refreshUser: () => void
    syncWithServer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const { addUser } = useSiteSettings()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [adminToken, setAdminToken] = useState<string | null>(null)

    // Helper to get admin auth headers for API calls
    const getAdminHeaders = (): Record<string, string> => {
        if (!adminToken) return {}
        return { 'x-admin-token': adminToken }
    }

    // Load saved session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('kstreamer_user')
        if (savedUser) {
            try {
                const parsedUser: User = JSON.parse(savedUser)

                // Check if banned
                if (parsedUser.isBanned) {
                    alert(`계정이 차단되었습니다. 사유: ${parsedUser.banReason || '관리자에게 문의하세요'}`)
                    localStorage.removeItem('kstreamer_user')
                    setUser(null)
                } else {
                    // Check membership expiration client-side
                    if (parsedUser.subscriptionEnd && new Date(parsedUser.subscriptionEnd) < new Date()) {
                        parsedUser.membership = 'guest'
                        parsedUser.subscriptionEnd = undefined
                        localStorage.setItem('kstreamer_user', JSON.stringify(parsedUser))
                    }
                    setUser(parsedUser)
                }
            } catch {
                localStorage.removeItem('kstreamer_user')
            }
        }
        setIsLoading(false)

        // Restore admin token from localStorage (persists across tabs/sessions)
        let savedToken = localStorage.getItem('admin_token')

        // Migration: Check sessionStorage if not in localStorage (for users from v2.7)
        if (!savedToken) {
            const sessionToken = sessionStorage.getItem('admin_token')
            if (sessionToken) {
                console.log('[Auth] Migrating admin token from sessionStorage to localStorage')
                localStorage.setItem('admin_token', sessionToken)
                savedToken = sessionToken
            }
        }

        if (savedToken) {
            setAdminToken(savedToken)
        }
    }, [])

    /**
     * LOGIN - Server-side verification with password hash check
     */
    const login = async (email: string, password: string): Promise<boolean> => {
        try {

            // Server-side login verification
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error || '로그인에 실패했습니다.')
                return false
            }

            if (data.success && data.user) {
                const loggedInUser: User = data.user
                setUser(loggedInUser)
                localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))

                // Store admin token if provided (e.g. partial login response)
                if (data.adminToken) {
                    setAdminToken(data.adminToken)
                    localStorage.setItem('admin_token', data.adminToken)
                    console.log('[AuthContext] Admin token saved from regular login')
                } else if (loggedInUser.role !== 'admin') {
                    // Clear old admin token if new user is not admin
                    setAdminToken(null)
                    localStorage.removeItem('admin_token')
                }

                return true
            }

            return false
        } catch (error) {
            console.error('Login failed:', error)
            alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
            return false
        }
    }

    /**
     * SIGNUP - Server-side with password hashing
     */
    const signup = async (email: string, password: string, name: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error || '회원가입에 실패했습니다.')
                return false
            }

            if (data.success && data.user) {
                const newUser: User = data.user
                setUser(newUser)
                localStorage.setItem('kstreamer_user', JSON.stringify(newUser))

                // Sync with SiteSettingsContext
                addUser({
                    email: newUser.email,
                    name: newUser.name,
                    membership: newUser.membership,
                })

                return true
            }

            return false
        } catch (error) {
            console.error('Signup failed:', error)
            alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
            return false
        }
    }

    /**
     * Google Login - Server-side verification
     */
    const loginWithGoogle = async (): Promise<boolean> => {
        setIsLoading(true)
        return new Promise((resolve) => {
            const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '52612991978-08f546e87gqo2a05m3n14lkevdhqemia.apps.googleusercontent.com'

            if (!client_id) {
                alert('Google Client ID가 설정되지 않았습니다.')
                setIsLoading(false)
                resolve(false)
                return
            }

            // 30초 후 자동 로딩 해제
            const timeoutId = setTimeout(() => {
                setIsLoading(false)
                resolve(false)
            }, 30000)

            // @ts-ignore
            const google = window.google

            if (!google) {
                clearTimeout(timeoutId)
                alert('구글 로그인 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
                setIsLoading(false)
                resolve(false)
                return
            }

            const client = google.accounts.oauth2.initTokenClient({
                client_id: client_id,
                scope: 'email profile openid',
                error_callback: (err: any) => {
                    clearTimeout(timeoutId)
                    console.error('GSI Error:', err)
                    setIsLoading(false)
                    resolve(false)
                },
                callback: async (response: any) => {
                    clearTimeout(timeoutId)
                    if (response.error) {
                        console.error('Google login error:', response.error)
                        setIsLoading(false)
                        resolve(false)
                        return
                    }

                    try {
                        // Get user info from Google
                        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${response.access_token}` },
                        })
                        const googleUser = await userInfoResponse.json()

                        if (!googleUser.email) {
                            throw new Error('No email from Google account')
                        }

                        // Server-side Google auth verification
                        const authRes = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: googleUser.email,
                                name: googleUser.name || googleUser.given_name,
                                avatar: googleUser.picture,
                            }),
                        })

                        const authData = await authRes.json()

                        if (!authRes.ok) {
                            alert(authData.error || 'Google 로그인에 실패했습니다.')
                            setIsLoading(false)
                            resolve(false)
                            return
                        }

                        if (authData.success && authData.user) {
                            const loggedInUser: User = authData.user
                            setUser(loggedInUser)
                            localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))

                            // Sync with SiteSettingsContext
                            addUser({
                                email: loggedInUser.email,
                                name: loggedInUser.name,
                                membership: loggedInUser.membership,
                            })

                            // Admin token for admin Google login
                            if (authData.adminToken) {
                                setAdminToken(authData.adminToken)
                                localStorage.setItem('admin_token', authData.adminToken)
                                console.log('[AuthContext] Admin token saved from Google login')
                            }

                            setIsLoading(false)
                            resolve(true)
                        } else {
                            setIsLoading(false)
                            resolve(false)
                        }
                    } catch (err) {
                        console.error('Failed to fetch Google user info:', err)
                        setIsLoading(false)
                        resolve(false)
                    }
                },
            })

            client.requestAccessToken()
        })
    }

    const logout = () => {
        setUser(null)
        setAdminToken(null)
        localStorage.removeItem('kstreamer_user')
        localStorage.removeItem('admin_token')
    }

    const refreshUser = () => {
        const savedUser = localStorage.getItem('kstreamer_user')
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser))
            } catch { /* ignore */ }
        }
    }

    // Sync user data from server (B2) — fetches the latest membership status
    const syncWithServer = useCallback(async () => {
        const savedUser = localStorage.getItem('kstreamer_user')
        if (!savedUser) return
        try {
            const parsed = JSON.parse(savedUser)
            if (!parsed?.email) return
            const res = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: parsed.email }),
            })
            if (res.ok) {
                const data = await res.json()
                if (data.user) {
                    setUser(data.user)
                    localStorage.setItem('kstreamer_user', JSON.stringify(data.user))
                }
            }
        } catch (err) {
            console.error('Failed to sync with server:', err)
        }
    }, [])

    const updateMembership = (level: MembershipLevel) => {
        if (!user) return
        const updatedUser = {
            ...user,
            membership: level,
            subscriptionEnd: (level === 'vip' || level === 'premium')
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                : undefined
        }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
    }

    const updateUserRole = (userId: string, role: UserRole) => {
        // This is now handled server-side via /api/auth/users
        console.log('updateUserRole now handled via API')
    }

    const banUser = (userId: string, reason: string) => {
        // This is now handled server-side via /api/auth/users
        console.log('banUser now handled via API')
    }

    const unbanUser = (userId: string) => {
        // This is now handled server-side via /api/auth/users
        console.log('unbanUser now handled via API')
    }

    const verifyEmail = () => {
        if (!user) return
        const updatedUser = { ...user, emailVerified: true }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
    }

    // const ADMIN_EMAIL = 'ynast21@gmail.com' // Removed hardcoded check

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAdmin: user?.role === 'admin',
            adminToken,
            getAdminHeaders,
            login,
            signup,
            logout,
            updateMembership,
            updateUserRole,
            banUser,
            unbanUser,
            verifyEmail,
            loginWithGoogle,
            refreshUser,
            syncWithServer,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// 🔒 Generate authentication token for API calls
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null

    const savedUser = localStorage.getItem('kstreamer_user')
    if (!savedUser) return null

    try {
        const user = JSON.parse(savedUser)
        const userJson = JSON.stringify(user)
        return Buffer.from(userJson, 'utf-8').toString('base64')
    } catch (error) {
        console.error('Error generating auth token:', error)
        return null
    }
}
