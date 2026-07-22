/**
 * @type {import('next').NextConfig}
 */

module.exports = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@uniformdev/canvas', '@uniformdev/design-system', '@uniformdev/mesh-sdk-react'],
  },
  turbopack: {
    resolveAlias: {
      '@codemirror/state': './node_modules/@codemirror/state/dist/index.cjs',
      // @lingui/core ships separate ESM and CJS builds, each with its own `i18n`
      // singleton. Contentful's field editors use the CJS build, so pin every
      // importer to it to avoid activating the wrong (ESM) singleton. See
      // activateContentfulI18n in embedded-editor-components/hacks.ts.
      '@lingui/core': './node_modules/@lingui/core/dist/index.cjs',
    },
  },
};
