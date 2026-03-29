const CACHE_NAME = 'pomodoro-pwa-cache-v3'
const APP_SHELL = [
  '/pomodoro-pwa/',
  '/pomodoro-pwa/index.html',
  '/pomodoro-pwa/manifest.webmanifest',
  '/pomodoro-pwa/icons/icon-192.png',
  '/pomodoro-pwa/icons/icon-512.png',
  '/pomodoro-pwa/media/keep-awake.mp4'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(async () => {
          if (event.request.mode === 'navigate') {
            return caches.match('/pomodoro-pwa/index.html')
          }
          return new Response('', { status: 504, statusText: 'Offline' })
        })
    }),
  )
})
