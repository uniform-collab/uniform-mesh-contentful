/**
 * @type {import('next').NextConfig}
 */

module.exports = {
  output: 'export',
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@uniformdev/canvas', '@uniformdev/design-system', '@uniformdev/mesh-sdk-react'],
  },
};
