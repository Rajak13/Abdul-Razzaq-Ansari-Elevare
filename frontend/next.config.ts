import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Disable Next.js image optimization - confirmed to reduce memory in Next.js 16.x
  // See: https://github.com/vercel/next.js/issues (active memory leak in 16.x)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Disable in-memory cache to prevent unbounded growth (Next.js 16 leak workaround)
  cacheMaxMemorySize: 0,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb' as any
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
    preloadEntriesOnStart: false,
    serverSourceMaps: false,
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Optimize chunk splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Separate chunk for large libraries
          lib: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'lib',
            priority: 30,
          },
        },
      },
    };

    return config;
  },
  // Optimize production builds
  poweredByHeader: false,
  compress: true,
};

module.exports = withNextIntl(nextConfig);
