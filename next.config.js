// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['jspdf', 'jspdf-autotable', 'firebase-admin'],
  },
  // Headers para garantir que manifest e ícones são servidos correctamente
  // mesmo em localhost (HTTP), sem problemas de cache ou MIME type
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type',                value: 'application/manifest+json' },
          { key: 'Cache-Control',               value: 'public, max-age=0, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/icons/:file*',
        headers: [
          { key: 'Content-Type',                value: 'image/png' },
          { key: 'Cache-Control',               value: 'public, max-age=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'jspdf', 'jspdf-autotable']
    }
    return config
  },
}

module.exports = nextConfig