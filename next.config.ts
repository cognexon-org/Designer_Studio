import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode double-invokes effects in development. For this app that means
  // the WebGL context, PMREM environment and every texture are built twice on
  // each mount, which is a large part of why development felt slow to load.
  // Production was never affected; disabling it makes dev match production.
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // 3D assets are content-addressed by path and only change on redeploy,
        // so a long immutable cache makes every visit after the first instant.
        source: '/assets/realistic/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
