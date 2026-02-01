/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    const base = BACKEND.endsWith('/') ? BACKEND.slice(0, -1) : BACKEND
    return [
      {
        source: "/backend-api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
