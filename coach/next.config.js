/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // NOTE: NEXT_PUBLIC_* variables are loaded from .env.local and Vercel
  // No localhost fallback in production
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, must-revalidate',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
