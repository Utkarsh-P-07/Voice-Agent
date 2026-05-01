// Service Worker — handles push notifications with alarm sound

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || '⏰ Task Reminder'
  const options = {
    body: data.body || 'You have a task due!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open app' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
