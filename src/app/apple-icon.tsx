import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
                    borderRadius: '40px',
                }}
            >
                <div
                    style={{
                        fontSize: '100px',
                        fontWeight: 900,
                        color: '#00FF88',
                        display: 'flex',
                        textShadow: '0 0 30px rgba(0,255,136,0.4)',
                    }}
                >
                    K
                </div>
            </div>
        ),
        { ...size }
    )
}
