const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap2.xml',
      },
      {
        // IndexNow key verification file: /{key}.txt → /api/indexnow-key
        source: '/:key([a-f0-9]{32}).txt',
        destination: '/api/indexnow-key',
      },
    ];
  },
}

module.exports = withNextIntl(nextConfig)
