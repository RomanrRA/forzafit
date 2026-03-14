import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  rewrites: async () => [
    {
      source: '/api/v1/:path*',
      destination: `${process.env.NEXT_BACKEND_URL || 'http://localhost:3001'}/:path*`,
    },
  ],
}

export default nextConfig
