// public/sw.js — Service Worker HGU AI Clínico
const CACHE = 'hgu-v4'
const STATIC = [
  '/',
  '/teleconsulta',
  '/auth',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

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
  let titulo = 'HGU AI Clínico'
  let corpo  = 'A sua teleconsulta foi revista pelo especialista.'
  let dados  = {}

  try {
    if (e.data) {
      const parsed = e.data.json()
      titulo = parsed.titulo || titulo
      corpo  = parsed.corpo  || corpo
      dados  = parsed.dados  || {}
    }
  } catch {
    try { corpo = e.data?.text() || corpo } catch {}
  }

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body:     corpo,
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-192.png',
      vibrate:  [200, 100, 200],
      tag:      'teleconsulta-revisada',
      renotify: true,
      data:     { url: '/teleconsulta', ...dados },
      actions: [
        { action: 'ver',    title: '👁️ Ver consulta' },
        { action: 'fechar', title: 'Fechar' },
      ],
    })
  )
})

// ── Clique na notificação ──
self.addEventListener('notificationclick', e => {
  e.notification.close()

  if (e.action === 'fechar') return

  const targetUrl = (e.notification.data?.url) || '/teleconsulta'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Procurar janela já aberta com a URL correcta
      for (const client of list) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // Procurar qualquer janela aberta do site e navegar
      for (const client of list) {
        if ('navigate' in client && 'focus' in client) {
          client.focus()
          return client.navigate(targetUrl)
        }
      }
      // Abrir nova janela se não houver nenhuma
      return clients.openWindow(targetUrl)
    })
  )
})