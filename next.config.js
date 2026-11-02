/**
 * @type {import('next').NextConfig}
 */

module.exports = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@uniformdev/canvas', '@uniformdev/design-system', '@uniformdev/mesh-sdk-react'],
  },
};
