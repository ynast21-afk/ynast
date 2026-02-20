import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['ko', 'en', 'ja', 'zh', 'es'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ko'

export default getRequestConfig(async () => {
    // Get locale from cookie or use default
    const cookieStore = cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    }
})
