'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 관리자 설정 - 이 이메일+비밀번호로 로그인한 사용자만 /admin 접근 가능
const ADMIN_EMAIL = 'ynast21@gmail.com'
const ADMIN_PASSWORD = 'dkf@741852'

export type MembershipLevel = 'guest' | 'basic' | 'vip' | 'premium'
export type UserRole = 'user' | 'moderator' | 'admin'

export interface User {
    id: string
    email: string
    name: string
    membership: MembershipLevel
    role: UserRole
    avatar?: string
    subscriptionEnd?: string
    isBanned: boolean
    banReason?: string
    createdAt: string
    lastLoginAt?: string
    emailVerified: boolean
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAdmin: boolean
    login: (email: string, password: string) => Promise<boolean>
    signup: (email: string, password: string, name: string) => Promise<boolean>
    logout: () => void
    updateMembership: (level: MembershipLevel) => void
    updateUserRole: (userId: string, role: UserRole) => void
    banUser: (userId: string, reason: string) => void
    unbanUser: (userId: string) => void
    verifyEmail: () => void
    loginWithGoogle: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 모든 사용자 목록 관리 (localStorage)
const USERS_STORAGE_KEY = 'kstreamer_users'

function getAllUsers(): User[] {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(USERS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
}

function saveAllUsers(users: User[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function updateUserInStorage(updatedUser: User) {
    const users = getAllUsers()
    const index = users.findIndex(u => u.id === updatedUser.id)
    if (index >= 0) {
        users[index] = updatedUser
    } else {
        users.push(updatedUser)
    }
    saveAllUsers(users)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('kstreamer_user')
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser)
            // 차단된 사용자 확인
            const allUsers = getAllUsers()
            const storedUser = allUsers.find(u => u.id === parsedUser.id)
            if (storedUser?.isBanned) {
                alert(`계정이 차단되었습니다. 사유: ${storedUser.banReason || '관리자에게 문의하세요'}`)
                localStorage.removeItem('kstreamer_user')
            } else {
                setUser({ ...parsedUser, ...storedUser })
            }
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

            // 기존 사용자 확인
            const allUsers = getAllUsers()
            let existingUser = allUsers.find(u => u.email === email)

            if (existingUser?.isBanned) {
                alert(`계정이 차단되었습니다. 사유: ${existingUser.banReason || '관리자에게 문의하세요'}`)
                return false
            }

            // 로그인 성공
            const loggedInUser: User = existingUser || {
                id: 'user_' + Date.now(),
                email,
                name: email.split('@')[0],
                membership: email === ADMIN_EMAIL ? 'premium' : 'guest',
                role: email === ADMIN_EMAIL ? 'admin' : 'user',
                isBanned: false,
                emailVerified: email === ADMIN_EMAIL,
                createdAt: new Date().toISOString(),
            }

            loggedInUser.lastLoginAt = new Date().toISOString()

            setUser(loggedInUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))
            updateUserInStorage(loggedInUser)
            return true
        } catch (error) {
            console.error('Login failed:', error)
            return false
        }
    }

    const loginWithGoogle = async (): Promise<boolean> => {
        setIsLoading(true)
        try {
            // Simulate Google Login delay
            await new Promise(resolve => setTimeout(resolve, 1500))

            // Mock Google user info
            const mockGoogleUser = {
                email: 'google_user@gmail.com',
                name: 'Google User',
                avatar: 'https://lh3.googleusercontent.com/a/default-user'
            }

            const allUsers = getAllUsers()
            let existingUser = allUsers.find(u => u.email === mockGoogleUser.email)

            if (existingUser?.isBanned) {
                alert(`계정이 차단되었습니다. 사유: ${existingUser.banReason || '관리자에게 문의하세요'}`)
                return false
            }

            const loggedInUser: User = existingUser || {
                id: 'google_' + Date.now(),
                email: mockGoogleUser.email,
                name: mockGoogleUser.name,
                membership: 'guest',
                role: 'user',
                avatar: mockGoogleUser.avatar,
                isBanned: false,
                emailVerified: true, // Google accounts are verified
                createdAt: new Date().toISOString(),
            }

            loggedInUser.lastLoginAt = new Date().toISOString()

            setUser(loggedInUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(loggedInUser))
            updateUserInStorage(loggedInUser)
            return true
        } catch (error) {
            console.error('Google Login failed:', error)
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const signup = async (email: string, password: string, name: string): Promise<boolean> => {
        try {
            const allUsers = getAllUsers()
            if (allUsers.some(u => u.email === email)) {
                alert('이미 등록된 이메일입니다.')
                return false
            }

            const newUser: User = {
                id: 'user_' + Date.now(),
                email,
                name,
                membership: 'guest',
                role: 'user',
                isBanned: false,
                emailVerified: false,
                createdAt: new Date().toISOString(),
            }

            setUser(newUser)
            localStorage.setItem('kstreamer_user', JSON.stringify(newUser))
            updateUserInStorage(newUser)
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
        if (!user) return
        const updatedUser = {
            ...user,
            membership: level,
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후
        }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
        updateUserInStorage(updatedUser)
    }

    const updateUserRole = (userId: string, role: UserRole) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.role = role
            saveAllUsers(allUsers)
        }
    }

    const banUser = (userId: string, reason: string) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.isBanned = true
            targetUser.banReason = reason
            saveAllUsers(allUsers)
        }
    }

    const unbanUser = (userId: string) => {
        const allUsers = getAllUsers()
        const targetUser = allUsers.find(u => u.id === userId)
        if (targetUser) {
            targetUser.isBanned = false
            targetUser.banReason = undefined
            saveAllUsers(allUsers)
        }
    }

    const verifyEmail = () => {
        if (!user) return
        const updatedUser = { ...user, emailVerified: true }
        setUser(updatedUser)
        localStorage.setItem('kstreamer_user', JSON.stringify(updatedUser))
        updateUserInStorage(updatedUser)
    }

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAdmin: user?.email === ADMIN_EMAIL,
            login,
            signup,
            logout,
            updateMembership,
            updateUserRole,
            banUser,
            unbanUser,
            verifyEmail,
            loginWithGoogle
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

// 모든 사용자 목록 가져오기 (관리자용)
export function useAllUsers() {
    const [users, setUsers] = useState<User[]>([])

    useEffect(() => {
        setUsers(getAllUsers())
    }, [])

    const refresh = () => {
        setUsers(getAllUsers())
    }

    return { users, refresh }
}
