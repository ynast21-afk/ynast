import { MetadataRoute } from 'next'

const BASE_URL = 'https://kdance.xyz'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/'],
            },
        ],
        sitemap: 'https://kdance.xyz/sitemap.xml',
    }
}
