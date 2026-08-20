/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
  "media-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' data: blob: https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://api.stripe.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
      {
        // The service worker must never be served from a stale cache.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

module.exports = nextConfig;
