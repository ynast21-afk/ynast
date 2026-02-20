import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'kStreamer dance - Premium K-Pop Dance Video Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Green glow effect */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />

                {/* Logo K */}
                <div
                    style={{
                        fontSize: '120px',
                        fontWeight: 900,
                        color: '#00FF88',
                        marginBottom: '20px',
                        display: 'flex',
                        textShadow: '0 0 40px rgba(0,255,136,0.5)',
                    }}
                >
                    K
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: '48px',
                        fontWeight: 800,
                        color: '#ffffff',
                        marginBottom: '12px',
                        display: 'flex',
                    }}
                >
                    kStreamer dance
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        fontSize: '24px',
                        color: '#9ca3af',
                        display: 'flex',
                    }}
                >
                    Premium K-Pop Dance Video Platform
                </div>

                {/* Bottom accent line */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '4px',
                        background: 'linear-gradient(90deg, transparent, #00FF88, transparent)',
                        display: 'flex',
                    }}
                />
            </div>
        ),
        { ...size }
    )
}
