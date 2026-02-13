import { NextResponse } from 'next/server'

// Simple health check endpoint for Paddle webhook verification
// Paddle will send a test ping to verify the webhook URL is reachable
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'paddle-webhook',
        timestamp: new Date().toISOString()
    })
}
