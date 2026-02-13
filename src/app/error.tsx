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
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-white p-4">
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <p className="text-bg-secondary mb-6">{error.message || "An unexpected error occurred."}</p>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-accent-primary text-black rounded-full font-bold hover:opacity-90"
            >
                Try again
            </button>
        </div>
    )
}
