interface WebSiteSchemaProps {
    name: string
    url: string
    description: string
}

interface OrganizationSchemaProps {
    name: string
    url: string
    logo?: string
}

interface VideoSchemaProps {
    name: string
    description: string
    thumbnailUrl: string
    uploadDate: string
    duration?: string
    contentUrl?: string
    embedUrl?: string
}

export function WebSiteSchema({ name, url, description }: WebSiteSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name,
        url,
        description,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${url}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function OrganizationSchema({ name, url, logo }: OrganizationSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        url,
        logo: logo || `${url}/logo.png`,
        sameAs: [
            // TODO: 소셜 미디어 URL 추가
        ],
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function VideoSchema({
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
    embedUrl,
}: VideoSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name,
        description,
        thumbnailUrl,
        uploadDate,
        ...(duration && { duration }),
        ...(contentUrl && { contentUrl }),
        ...(embedUrl && { embedUrl }),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}
