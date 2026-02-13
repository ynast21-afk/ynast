import { useState, useEffect, useRef } from 'react'

export function useInView(options?: IntersectionObserverInit) {
    const [isInView, setIsInView] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true)
                if (element) observer.unobserve(element)
            }
        }, options)

        if (element) {
            observer.observe(element)
        }

        return () => {
            if (element) observer.unobserve(element)
        }
    }, [options])

    return { ref, isInView }
}
