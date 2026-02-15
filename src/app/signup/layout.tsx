import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sign Up | kStreamer dance',
    robots: {
        index: false,
        follow: false,
    },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
