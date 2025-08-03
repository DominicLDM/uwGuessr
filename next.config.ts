import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable compression
  compress: true,
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@apollo/client'],
    // Enable faster refresh
    turbo: {
      resolveAlias: {
        // Reduce bundle size by aliasing heavy libraries only when needed
        canvas: './src/lib/canvas-fallback.js',
      }
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lktrqdrtrnoebqlgfera.supabase.co',
        pathname: '/storage/v1/object/public/images/**',
      },
    ],
    // Optimize image loading
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

export default nextConfig;
