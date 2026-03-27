// public/sw.js — Service Worker HGU AI Clínico
const CACHE = 'hgu-v3'
const STATIC = [
  '/',
  '/teleconsulta',
  '/auth',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Instalar ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  )
})

// ── Activar ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (!url.protocol.startsWith('http')) return
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
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

// ── Push Notifications ──
self.addEventListener('push', e => {
  let data = { titulo: 'HGU AI Clínico', corpo: 'A sua teleconsulta foi revista.', dados: {} }

  try {
    const parsed = e.data?.json()
    if (parsed) data = { ...data, ...parsed }
  } catch {}

  const options = {
    body: data.corpo,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'teleconsulta-revisada',
    renotify: true,
    data: data.dados,
    actions: [
      { action: 'ver', title: '👁️ Ver consulta' },
      { action: 'fechar', title: 'Fechar' },
    ],
  }

  e.waitUntil(
    self.registration.showNotification(data.titulo, options)
  )
})

// ── Clique na notificação ──
self.addEventListener('notificationclick', e => {
  e.notification.close()

  if (e.action === 'fechar') return

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se já há uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes('/teleconsulta') && 'focus' in client) {
          return client.focus()
        }
      }
      // Senão abrir nova janela
      return clients.openWindow('/teleconsulta')
    })
  )
})