'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Error Boundary]', error)

        // Auto-recover from browser extension DOM errors (removeChild, insertBefore, etc.)
        if (
            error.message?.includes('removeChild') ||
            error.message?.includes('insertBefore') ||
            error.message?.includes('is not a child of this node')
        ) {
            console.warn('[Error Boundary] Detected browser extension DOM conflict, auto-retrying...')
            const timer = setTimeout(() => reset(), 1000)
            return () => clearTimeout(timer)
        }
    }, [error, reset])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-white p-4">
            <h2 className="text-2xl font-bold mb-4">⚠️ 오류가 발생했습니다</h2>
            <p className="text-gray-400 mb-2 text-center max-w-md">
                브라우저 확장 프로그램이 페이지와 충돌했을 수 있습니다.
            </p>
            <p className="text-gray-500 mb-6 text-xs font-mono bg-gray-900 px-3 py-1 rounded max-w-lg truncate">
                {error.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => reset()}
                    className="px-6 py-2 bg-accent-primary text-black rounded-full font-bold hover:opacity-90"
                >
                    다시 시도
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600"
                >
                    페이지 새로고침
                </button>
            </div>
        </div>
    )
}
