/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  transpilePackages: ['@pos/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
