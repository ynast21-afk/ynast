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
    author?: string
    authorUrl?: string
    authorImage?: string
    tags?: string[]
    views?: number
    likes?: number
    videoId?: string
}

interface PersonSchemaProps {
    name: string
    alternateName?: string
    url: string
    image?: string
    description?: string
    followerCount?: number
    videoCount?: number
    tags?: string[]
}

interface BreadcrumbItem {
    name: string
    url: string
}

interface BreadcrumbSchemaProps {
    items: BreadcrumbItem[]
}

interface ItemListSchemaProps {
    name: string
    description: string
    url: string
    items: {
        name: string
        url: string
        image?: string
        position: number
    }[]
}

export function WebSiteSchema({ name, url, description }: WebSiteSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name,
        url,
        description,
        inLanguage: ['ko', 'en', 'ja'],
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${url}/tags/{search_term_string}`,
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
        sameAs: [],
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
    author,
    authorUrl,
    authorImage,
    tags,
    views,
    likes,
    videoId,
}: VideoSchemaProps) {
    const baseUrl = 'https://kdance.xyz'

    const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name,
        description,
        thumbnailUrl: [thumbnailUrl],
        uploadDate,
        ...(duration && { duration }),
        ...(contentUrl && { contentUrl }),
        ...(embedUrl && { embedUrl }),
        // Publisher info for Google Video rich results
        publisher: {
            '@type': 'Organization',
            name: 'kStreamer dance',
            url: baseUrl,
            logo: {
                '@type': 'ImageObject',
                url: `${baseUrl}/logo.png`,
            },
        },
        // Author/Creator
        author: {
            '@type': 'Person',
            name: author || 'kStreamer Creator',
            ...(authorUrl && { url: authorUrl }),
            ...(authorImage && { image: authorImage }),
        },
        // Tags as keywords - critical for search
        ...(tags && tags.length > 0 && {
            keywords: tags.map(t => t.replace('#', '')).join(', '),
        }),
        // Interaction stats - boosts search ranking
        ...(views !== undefined && {
            interactionStatistic: [
                {
                    '@type': 'InteractionCounter',
                    interactionType: { '@type': 'WatchAction' },
                    userInteractionCount: views,
                },
                ...(likes !== undefined ? [{
                    '@type': 'InteractionCounter',
                    interactionType: { '@type': 'LikeAction' },
                    userInteractionCount: likes,
                }] : []),
            ],
        }),
        // Thumbnail as ImageObject for Google Images
        thumbnail: {
            '@type': 'ImageObject',
            url: thumbnailUrl,
            width: 1280,
            height: 720,
            ...(author && { caption: `${name} - ${author}` }),
        },
        // URL
        ...(videoId && { url: `${baseUrl}/video/${videoId}` }),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

/**
 * Person Schema - for streamer/actor profiles
 * Helps Google show Profile Cards in search results
 */
export function PersonSchema({
    name,
    alternateName,
    url,
    image,
    description,
    followerCount,
    videoCount,
    tags,
}: PersonSchemaProps) {
    const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        ...(alternateName && { alternateName }),
        url,
        ...(image && { image }),
        ...(description && { description }),
        jobTitle: 'Content Creator',
        // Follower count for social proof
        ...(followerCount !== undefined && {
            interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'FollowAction' },
                userInteractionCount: followerCount,
            },
        }),
        // Tags the person is known for
        ...(tags && tags.length > 0 && {
            knowsAbout: tags.map(t => t.replace('#', '')),
        }),
        // Associated with our platform
        memberOf: {
            '@type': 'Organization',
            name: 'kStreamer dance',
            url: 'https://kdance.xyz',
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

/**
 * Breadcrumb Schema - helps Google understand site hierarchy
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

/**
 * ItemList Schema - for tag listing pages, video galleries
 * Helps Google show Carousel rich results
 */
export function ItemListSchema({ name, description, url, items }: ItemListSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        description,
        url,
        numberOfItems: items.length,
        itemListElement: items.map((item) => ({
            '@type': 'ListItem',
            position: item.position,
            name: item.name,
            url: item.url,
            ...(item.image && {
                image: {
                    '@type': 'ImageObject',
                    url: item.image,
                },
            }),
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

/**
 * ImageGallery Schema - for streamer profile pages with multiple images
 * Helps Google Images discover and index all thumbnails associated with a streamer
 */
interface ImageGallerySchemaProps {
    name: string
    description: string
    url: string
    images: {
        url: string
        caption: string
        name: string
    }[]
}

export function ImageGallerySchema({ name, description, url, images }: ImageGallerySchemaProps) {
    if (!images || images.length === 0) return null

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url,
        mainEntity: {
            '@type': 'ImageGallery',
            name: `${name} Gallery`,
            about: description,
            image: images.map((img) => ({
                '@type': 'ImageObject',
                url: img.url,
                contentUrl: img.url,
                name: img.name,
                caption: img.caption,
                width: 1280,
                height: 720,
            })),
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

/**
 * FAQPage Schema - for pages with frequently asked questions
 * Helps Google show FAQ rich results directly in search
 */
interface FAQItem {
    question: string
    answer: string
}

interface FAQPageSchemaProps {
    faqs: FAQItem[]
}

export function FAQPageSchema({ faqs }: FAQPageSchemaProps) {
    if (!faqs || faqs.length === 0) return null

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}
