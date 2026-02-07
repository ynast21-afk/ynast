const withNextIntl = require('next-intl/config')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withNextIntl(nextConfig)
