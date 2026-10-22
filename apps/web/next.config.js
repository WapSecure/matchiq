//@ts-check

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/** Browsers must revalidate the worker on every check so updates are seen. */
const SERVICE_WORKER_HEADERS = [
  { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  { key: 'Content-Security-Policy', value: "default-src 'self'" },
  { key: 'Service-Worker-Allowed', value: '/' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/sw.js', headers: SERVICE_WORKER_HEADERS },
    ];
  },
};

module.exports = nextConfig;
