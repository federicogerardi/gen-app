import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // pdfjs-dist v5 uses relative dynamic imports to load pdf.worker.mjs at runtime.
  // When bundled by Next.js the absolute chunk path no longer resolves; keeping it
  // as a server-external package lets Node.js resolve it directly from node_modules.
  serverExternalPackages: ['pdfjs-dist'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
