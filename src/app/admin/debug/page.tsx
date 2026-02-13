'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext' // NEW: Import AuthContext

export default function DebugPage() {
    // --- Context Inspection ---
    const { user, isAdmin, adminToken, isLoading: authLoading } = useAuth()

    // --- Local State ---
    const [localStorageToken, setLocalStorageToken] = useState<string | null>(null)
    const [sessionStorageToken, setSessionStorageToken] = useState<string | null>(null)
    const [apiResult, setApiResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // --- Login Tester State ---
    const [testEmail, setTestEmail] = useState('')
    const [testPassword, setTestPassword] = useState('')
    const [loginResult, setLoginResult] = useState<any>(null)
    const [loginLoading, setLoginLoading] = useState(false)

    const checkStorage = () => {
        if (typeof window !== 'undefined') {
            setLocalStorageToken(localStorage.getItem('admin_token'))
            setSessionStorageToken(sessionStorage.getItem('admin_token'))
        }
    }

    useEffect(() => {
        checkStorage()
    }, [])

    const runDiagnostics = async () => {
        setLoading(true)
        setError(null)
        setApiResult(null)

        try {
            const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }

            if (token) {
                headers['x-admin-token'] = token
            }

            const response = await fetch('/api/auth/debug', {
                method: 'GET',
                headers: headers
            })

            const data = await response.json()
            setApiResult(data)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch debug API')
        } finally {
            setLoading(false)
        }
    }

    const testLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginLoading(true)
        setLoginResult(null)

        try {
            // 1. Test Admin Verify directly
            const verifyRes = await fetch('/api/auth/admin-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail, password: testPassword }),
            })
            const verifyData = await verifyRes.json()

            // 2. Test Normal Login
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail, password: testPassword }),
            })
            const loginData = await loginRes.json()

            setLoginResult({
                adminVerify: {
                    status: verifyRes.status,
                    ok: verifyRes.ok,
                    data: verifyData
                },
                login: {
                    status: loginRes.status,
                    ok: loginRes.ok,
                    data: loginData
                }
            })

            // Update storage check after test
            setTimeout(checkStorage, 500)

        } catch (err: any) {
            setLoginResult({ error: err.message })
        } finally {
            setLoginLoading(false)
        }
    }

    const forceReset = () => {
        if (confirm('Are you sure you want to clear all tokens? You will need to log in again.')) {
            localStorage.removeItem('admin_token')
            sessionStorage.removeItem('admin_token')
            localStorage.removeItem('kstreamer_user')
            checkStorage()
            alert('Tokens cleared. Please verify if issues persist after re-login.')
            window.location.href = '/login'
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6 text-red-500">🛠️ Admin Auth Diagnostics (v2.8.4 - Login Tested)</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Client Status & AuthContext */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold mb-4">🖥️ Client Storage</h2>
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-gray-400">localStorage (admin_token)</p>
                                <div className={`p-2 rounded font-mono text-xs break-all ${localStorageToken ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {localStorageToken ? 'PRESENT' : 'MISSING'}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">sessionStorage (admin_token)</p>
                                <div className={`p-2 rounded font-mono text-xs break-all ${sessionStorageToken ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                                    {sessionStorageToken ? 'PRESENT' : 'MISSING'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <h2 className="text-xl font-bold mb-4">🧠 AuthContext State</h2>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">isLoading:</span>
                                <span className={authLoading ? 'text-yellow-400' : 'text-green-400'}>{String(authLoading)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">isAdmin:</span>
                                <span className={isAdmin ? 'text-green-400' : 'text-red-400'}>{String(isAdmin)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">User Email:</span>
                                <span className="text-white">{user?.email || 'null'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Context Token:</span>
                                <span className={adminToken ? 'text-green-400' : 'text-red-400'}>{adminToken ? 'PRESENT' : 'NULL'}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={checkStorage}
                        className="w-full mt-2 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 rounded transition-colors"
                    >
                        🔄 Refresh Status
                    </button>
                    <button
                        onClick={forceReset}
                        className="w-full mt-2 py-2 text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded transition-colors border border-red-900/50"
                    >
                        🗑️ Force Reset & Checkout
                    </button>
                </div>

                {/* 2. Server Diagnostics */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">📡 Server Connection Check</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Sends a request with the current token to verify if the server accepts it.
                    </p>

                    <button
                        onClick={runDiagnostics}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors disabled:opacity-50 mb-4"
                    >
                        {loading ? 'Running Tests...' : '🚀 Test Connection'}
                    </button>

                    {apiResult && (
                        <div className="flex-1 bg-black/30 p-4 rounded-lg overflow-y-auto max-h-[300px] font-mono text-xs">
                            <div className={`mb-2 font-bold ${apiResult.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                STATUS: {apiResult.status.toUpperCase()}
                            </div>
                            <pre className="text-gray-300">
                                {JSON.stringify(apiResult, null, 2)}
                            </pre>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-500/20 text-red-200 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* 3. Login Tester */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">🔑 Login Simulator</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Directly test the login endpoints to see if they return a token.
                    </p>

                    <form onSubmit={testLogin} className="space-y-4 mb-4">
                        <input
                            type="email"
                            placeholder="Admin Email"
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white"
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white"
                            value={testPassword}
                            onChange={e => setTestPassword(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            {loginLoading ? 'Testing...' : '🧪 Test Login API'}
                        </button>
                    </form>

                    {loginResult && (
                        <div className="flex-1 bg-black/30 p-4 rounded-lg overflow-y-auto max-h-[300px] font-mono text-xs">
                            <h4 className="font-bold text-gray-400 mb-1">/api/auth/admin-verify</h4>
                            <pre className={`mb-4 ${loginResult.adminVerify.ok ? 'text-green-400' : 'text-red-400'}`}>
                                {JSON.stringify(loginResult.adminVerify.data, null, 2)}
                            </pre>

                            <h4 className="font-bold text-gray-400 mb-1">/api/auth/login</h4>
                            <pre className={`${loginResult.login.ok ? 'text-green-400' : 'text-red-400'}`}>
                                {JSON.stringify(loginResult.login.data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
