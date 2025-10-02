//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },

  // Build configuration
  output: 'standalone',

  // Treat build errors as warnings for error pages (404/500)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Performance optimizations
  poweredByHeader: false,

  // Compression and optimization
  compress: true,
  generateEtags: true,

  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false,
  },

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['recharts', 'react-dom'],
    // Disable static error page generation (we use App Router error handling)
    appDocumentPreloading: true,
  },

  // Webpack optimizations
  webpack: (config, { dev }) => {
    // Production optimizations
    if (!dev) {
      // Optimize chunk splitting for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          cacheGroups: {
            default: false,
            vendors: false,

            // Framework chunk for React/Next.js core
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },

            // Separate chunk for Recharts (large charting library)
            charts: {
              name: 'charts',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              priority: 30,
              enforce: true,
            },

            // Common libraries chunk
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'commons',
              chunks: 'all',
              priority: 20,
              minChunks: 2,
              reuseExistingChunk: true,
            },

            // Shared UI components
            shared: {
              name: 'shared',
              chunks: 'all',
              test: /[\\/]src[\\/]app[\\/]components[\\/]/,
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Tree shaking for unused exports
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Enhanced tree shaking and dead code elimination
      config.optimization.usedExports = true;
      config.optimization.providedExports = true;
    }

    // Bundle analysis can be enabled by installing webpack-bundle-analyzer
    // and uncommenting this section

    return config;
  },

  // Headers for performance
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
    {
      source: '/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
