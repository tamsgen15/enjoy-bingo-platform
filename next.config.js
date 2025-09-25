/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: []
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
  // Ensure audio files are included in build
  async rewrites() {
    return [
      {
        source: '/audio/:path*',
        destination: '/audio/:path*',
      },
    ]
  }
}

module.exports = nextConfig