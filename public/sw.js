// public/sw.js — Service Worker HGU AI Clínico
const CACHE = 'hgu-v2'
const STATIC = ['/', '/teleconsulta', '/auth']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // ── Ignorar tudo que não seja http/https (chrome-extension://, etc.) ──
  if (!url.protocol.startsWith('http')) return

  // ── Ignorar métodos que não sejam GET ──
  if (e.request.method !== 'GET') return

  // ── Ignorar rotas de API e serviços externos ──
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Só fazer cache de respostas válidas
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})