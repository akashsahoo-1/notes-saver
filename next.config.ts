import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep pdf-parse (and its bundled pdfjs) as external server packages
  // so webpack doesn't try to bundle them — they rely on native Node.js APIs
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
}

export default nextConfig
