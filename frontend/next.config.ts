import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb' as any
    },
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
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
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
};

module.exports = withNextIntl(nextConfig);
