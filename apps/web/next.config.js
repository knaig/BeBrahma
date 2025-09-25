/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['images.clerk.dev'],
  },
}

module.exports = nextConfig
