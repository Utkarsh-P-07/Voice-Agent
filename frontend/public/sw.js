// VoiceAgent Service Worker — handles Web Push notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  if (!event.data) return

  let payload = {}
  try { payload = event.data.json() } catch { payload = { title: 'VoiceAgent', body: event.data.text() } }

  const title   = payload.title || 'VoiceAgent'
  const options = {
    body:    payload.body  || '',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [200, 100, 200],
    data:    payload.data  || {},
    actions: payload.data?.type === 'reminder' ? [
      { action: 'done',   title: '✅ Mark done'  },
      { action: 'snooze', title: '⏰ Snooze 10m' },
    ] : [],
    tag:              payload.data?.todo_id || 'va-notification',
    renotify:         true,
    requireInteraction: payload.data?.type === 'reminder',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const data   = event.notification.data || {}
  const action = event.action

  if (action === 'snooze' && data.todo_id) {
    // Tell the backend to snooze (fire again in 10 min)
    fetch(`/api/push/snooze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ todo_id: data.todo_id, minutes: 10 }),
    }).catch(() => {})
    return
  }

  if (action === 'done' && data.todo_id) {
    fetch(`/api/todos/${data.todo_id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ done: true }),
    }).catch(() => {})
  }

  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const appUrl = '/'
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(appUrl)
    })
  )
})
