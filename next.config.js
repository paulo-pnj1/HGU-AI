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
  // Garante que o Next.js não tente pre-renderizar páginas dinamicas
  // e evita o erro "<Html> should not be imported outside of pages/_document"
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Evita que jsPDF (browser-only) seja avaliado no servidor durante o build
      config.externals = [...(config.externals || []), 'jspdf', 'jspdf-autotable']
    }
    return config
  },
}

module.exports = nextConfig