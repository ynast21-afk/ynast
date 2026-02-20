'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { defaultSettings } from '@/contexts/SiteSettingsContext'

export default function AdminSettingsPage() {
    const [currentSettings, setCurrentSettings] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [resetting, setResetting] = useState(false)

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/settings?t=' + Date.now()) // Anti-cache
            const data = await res.json()
            setCurrentSettings(data)
        } catch (e) {
            console.error(e)
            alert('Failed to fetch settings')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    const handleReset = async () => {
        if (!confirm('경고: B2 서버에 저장된 모든 사이트 설정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.\n\n"v1.7.0" 같은 오래된 데이터가 영구적으로 삭제되고 최신 코드로 덮어씌워집니다.')) {
            return
        }

        setResetting(true)
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaultSettings)
            })

            if (res.ok) {
                alert('초기화 성공! B2 서버 설정이 기본값으로 복구되었습니다.\n이제 라이브 사이트를 새로고침하여 확인해주세요.')
                // Reload current settings
                fetchSettings()
            } else {
                alert('초기화 실패. 로그를 확인해주세요.')
            }
        } catch (e) {
            console.error(e)
            alert('초기화 중 오류 발생')
        } finally {
            setResetting(false)
        }
    }

    return (
        <div className="min-h-screen bg-bg-primary text-white p-8 font-mono">
            <Header />
            <div className="h-20" />

            <h1 className="text-3xl font-bold mb-8 text-accent-primary">B2 Persistence Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Current State */}
                <div className="bg-bg-secondary p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">📡 Remote Settings (B2)</h2>
                        <button
                            onClick={fetchSettings}
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-text-secondary animate-pulse">Loading from B2...</p>
                    ) : (
                        <div className="bg-black/50 p-4 rounded overflow-auto h-[500px] text-xs">
                            <pre>{JSON.stringify(currentSettings, null, 2)}</pre>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-6">
                    <div className="bg-red-900/20 p-6 rounded-xl border border-red-500/50">
                        <h2 className="text-xl font-bold text-red-400 mb-2">⚠️ Danger Zone</h2>
                        <p className="text-sm text-text-secondary mb-6">
                            This action will overwrite the `settings.json` file in your Backblaze B2 bucket with the default values defined in the current codebase.
                            <br /><br />
                            Use this to fix &quot;persistent old text&quot; or &quot;undeletable banners&quot; issues caused by stale server-side data.
                        </p>

                        <button
                            onClick={handleReset}
                            disabled={resetting}
                            className={`w-full py-4 rounded font-bold text-lg transition-all ${resetting
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20'
                                }`}
                        >
                            {resetting ? 'RESETTING...' : 'FACTORY RESET B2 SETTINGS'}
                        </button>
                    </div>

                    <div className="bg-bg-secondary p-6 rounded-xl border border-white/10">
                        <h2 className="text-xl font-bold mb-4">ℹ️ Default Values Preview</h2>
                        <div className="bg-black/50 p-4 rounded overflow-auto h-[300px] text-xs text-text-secondary">
                            <pre>{JSON.stringify(defaultSettings, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
