'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 관리자 설정 - 이 이메일+비밀번호로 로그인한 사용자만 /admin 접근 가능
const ADMIN_EMAIL = 'ynast21@gmail.com'
const ADMIN_PASSWORD = 'dkf@741852'

export type MembershipLevel = 'guest' | 'basic' | 'vip' | 'premium'

export interface User {
    id: string
    email: string
    name: string
    membership: MembershipLevel
    avatar?: string
    subscriptionEnd?: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAdmin: boolean
    login: (email: string, password: string) => Promise<boolean>
    signup: (email: string, password: string, name: string) => Promise<boolean>
    logout: () => void
    updateMembership: (level: MembershipLevel) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('kstreamer_user')
        if (savedUser) {
            setUser(JSON.parse(savedUser))
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            // 관리자 이메일인 경우 비밀번호 검증
            if (email === ADMIN_EMAIL) {
                if (password !== ADMIN_PASSWORD) {
                    console.error('관리자 비밀번호가 틀렸습니다.')
                    return false
                }
            }

            // 로그인 성공
            const mockUser: User = {
                id: 'user_' + Date.now(),
                email,
                name: email.split('@')[0],
                membership: email === ADMIN_EMAIL ? 'premium' : 'guest',
            }

            setUser(mockUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(mockUser))
            return true
        } catch (error) {
            console.error('Login failed:', error)
            return false
        }
    }

    const signup = async (email: string, password: string, name: string): Promise<boolean> => {
        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/auth/signup', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ email, password, name }),
            // })

            const mockUser: User = {
                id: 'user_' + Date.now(),
                email,
                name,
                membership: 'guest',
            }

            setUser(mockUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(mockUser))
            return true
        } catch (error) {
            console.error('Signup failed:', error)
            return false
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('kstreamer_user')
    }

    const updateMembership = (level: MembershipLevel) => {
        if (user) {
            const updatedUser = { ...user, membership: level }
            setUser(updatedUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
        }
    }

    // 관리자 여부 확인
    const isAdmin = user?.email === ADMIN_EMAIL

    return (
        <AuthContext.Provider value={{ user, isLoading, isAdmin, login, signup, logout, updateMembership }}>
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
