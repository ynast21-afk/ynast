/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/data/**/*.{js,ts,jsx,tsx,mdx}',
        './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'bg-primary': '#0a0a0a',
                'bg-secondary': '#1a1a1a',
                'bg-tertiary': '#2a2a2a',
                'accent-primary': '#00ff88',
                'accent-secondary': '#ff00ff',
                'text-primary': '#ffffff',
                'text-secondary': '#888888',
            },
            fontFamily: {
                sans: ['Spline Sans', 'sans-serif'],
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)' },
                    '50%': { boxShadow: '0 0 50px rgba(0, 255, 136, 0.6)' },
                },
            },
        },
    },
    plugins: [],
    safelist: [
        {
            pattern: /(from|to)-(pink|purple|blue|indigo|cyan|teal|amber|orange|rose|violet|emerald|slate|gray|red|fuchsia)-(400|500|600|700)/,
        },
        'bg-gradient-to-br',
    ],
}
