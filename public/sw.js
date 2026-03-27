// public/sw.js-Service Worker HGU AI Clínico
const CACHE = 'hgu-v3'
const STATIC = [
  '/',
  '/teleconsulta',
  '/auth',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Instalar: pré-cache das páginas estáticas ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  )
})

// ── Activar: limpar caches antigas ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: Network-first com fallback para cache ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Ignorar protocolos não-http
  if (!url.protocol.startsWith('http')) return

  // Ignorar métodos que não sejam GET
  if (e.request.method !== 'GET') return

  // Ignorar rotas de API-sempre vão à rede
  if (url.pathname.startsWith('/api/')) return

  // Ignorar serviços externos (Firebase, Google)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('anthropic')
  ) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})