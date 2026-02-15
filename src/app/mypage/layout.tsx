import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Page | kStreamer dance',
    robots: {
        index: false,
        follow: false,
    },
}

export default function MypageLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
