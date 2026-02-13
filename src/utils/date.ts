
export const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return ''

    // If it's already relative (contains 'ago' or '전') -> just return it
    if (dateString.includes('ago') || dateString.includes('전')) return dateString

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString

        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 0) return 'Just now' // Future date (fallback)
        if (diffInSeconds < 60) return 'Just now'

        const diffInMinutes = Math.floor(diffInSeconds / 60)
        if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`

        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`

        const diffInDays = Math.floor(diffInHours / 24)
        if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`

        const diffInWeeks = Math.floor(diffInDays / 7)
        if (diffInWeeks < 4) return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`

        const diffInMonths = Math.floor(diffInDays / 30)
        if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`

        const diffInYears = Math.floor(diffInDays / 365)
        return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`
    } catch {
        return dateString
    }
}
