import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting.
  output: 'export',
  trailingSlash: true,

  // Required: static export can't optimize images at build time.
  images: { unoptimized: true },

  // Stable build ID across rebuilds (cache friendliness for hosting).
  generateBuildId: async () => 'fixatl-build',
};

export default nextConfig;
