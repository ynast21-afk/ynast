'use client'

import { useState, useEffect } from 'react'
import { useStreamers } from '@/contexts/StreamerContext'
import Header from '@/components/Header'

export default function DiagnosePage() {
    const { activeBucketName, downloadToken, videos } = useStreamers()
    const [serverStatus, setServerStatus] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [testResult, setTestResult] = useState<string>('')

    const checkServer = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/upload?type=upload') // Reusing upload auth to get bucket name
            const data = await res.json()
            setServerStatus(data)
        } catch (e) {
            console.error(e)
            setServerStatus({ error: 'Failed to connect to server' })
        } finally {
            setLoading(false)
        }
    }

    const runTest = async () => {
        if (videos.length === 0) {
            setTestResult('No videos to test')
            return
        }

        const sampleVideo = videos[0]
        const originalUrl = sampleVideo.videoUrl

        let log = `Testing Video: ${sampleVideo.title} (${sampleVideo.id})\n`
        log += `Original URL: ${originalUrl}\n`

        if (!originalUrl) {
            setTestResult(log + '❌ No URL found')
            return
        }

        // Simulate Client Logic
        let finalUrl = originalUrl
        if (originalUrl.includes('backblazeb2.com/file/') && activeBucketName) {
            const parts = originalUrl.split('/')
            const fileIndex = parts.indexOf('file')
            if (fileIndex !== -1 && parts.length > fileIndex + 1) {
                const urlBucket = parts[fileIndex + 1]
                log += `URL Bucket: ${urlBucket} vs Active Bucket: ${activeBucketName}\n`
                if (urlBucket !== activeBucketName) {
                    parts[fileIndex + 1] = activeBucketName
                    finalUrl = parts.join('/')
                    log += `✅ URL Corrected to: ${finalUrl}\n`
                } else {
                    log += `✅ URL matches active bucket.\n`
                }
            }
        }

        // Add Token
        let authUrl = finalUrl
        if (downloadToken && finalUrl.includes('backblazeb2.com')) {
            authUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}Authorization=${downloadToken}`
            log += `🔑 Token appended.\n`
        }

        log += `\nAttempting HEAD request to: ${authUrl}\n`

        try {
            const res = await fetch(authUrl, { method: 'HEAD' })
            log += `Response Status: ${res.status} ${res.statusText}\n`
            if (res.ok) {
                log += `✅ SUCCESS! Video is accessible.`
            } else {
                log += `❌ FAILED! Server refused access.`
            }
        } catch (e: any) {
            log += `❌ Network Error: ${e.message}\n`
            log += `(CORS might block HEAD requests, try clicking the link below)`
        }

        setTestResult(log)
    }

    return (
        <div className="min-h-screen bg-bg-primary text-white p-8 font-mono">
            <Header />
            <div className="h-20" />

            <h1 className="text-3xl font-bold mb-8 text-accent-primary">B2 Precision Diagnosis</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client State */}
                <div className="bg-bg-secondary p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4">🖥️ Client State (StreamerContext)</h2>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-text-secondary">Active Bucket Name:</span> <span className="text-green-400">{activeBucketName || 'NULL'}</span></p>
                        <p><span className="text-text-secondary">Download Token:</span> <span className="text-yellow-400">{downloadToken ? `${downloadToken.substring(0, 20)}...` : 'NULL'}</span></p>
                        <p><span className="text-text-secondary">Loaded Videos:</span> {videos.length}</p>
                    </div>
                </div>

                {/* Server State */}
                <div className="bg-bg-secondary p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4">☁️ Server State (API)</h2>
                    <button
                        onClick={checkServer}
                        className="mb-4 px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-700"
                    >
                        Refresh Server Info
                    </button>
                    {loading && <p>Loading...</p>}
                    {serverStatus && (
                        <div className="space-y-2 text-sm whitespace-pre-wrap">
                            <p><span className="text-text-secondary">Resolved Bucket Name:</span> <span className="text-green-400">{serverStatus.bucketName}</span></p>
                            <p><span className="text-text-secondary">Download URL Base:</span> {serverStatus.downloadUrl}</p>
                            {serverStatus.error && <p className="text-red-500">{serverStatus.error}</p>}
                            <p className="text-xs text-text-tertiary mt-2">{JSON.stringify(serverStatus, null, 2)}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Comparison */}
            <div className="mt-8 bg-black/50 p-6 rounded-xl border border-accent-primary/30">
                <h2 className="text-xl font-bold mb-4">🔍 Connectivity Test</h2>
                <button
                    onClick={runTest}
                    className="px-6 py-3 bg-accent-primary text-black font-bold rounded hover:opacity-90 transition-opacity"
                >
                    Run Live Video Check
                </button>

                {testResult && (
                    <div className="mt-6 p-4 bg-black rounded border border-white/10 overflow-x-auto">
                        <pre className="text-sm">{testResult}</pre>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <p className="text-text-secondary text-xs">
                    * If Client Bucket and Server Bucket matches, but Status is 404: File path in DB is wrong.<br />
                    * If Client Bucket and Server Bucket mismatch: Context Sync Logic is broken.<br />
                    * If 401 Unauthorized: Token is expired or scope is wrong.
                </p>
            </div>
        </div>
    )
}
