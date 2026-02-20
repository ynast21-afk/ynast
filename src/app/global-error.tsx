'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
                    <h2 className="text-2xl font-bold mb-4">Critical Error</h2>
                    <p className="mb-6">Something went wrong globally.</p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-2 bg-green-500 text-black rounded-full font-bold"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
