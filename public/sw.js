// Service Worker para notificações push
const CACHE_NAME = 'desapego-cache-v1';

// Arquivos para cache offline
const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => {
          return name !== CACHE_NAME;
        }).map((name) => {
          return caches.delete(name);
        })
      );
    })
  );
});

// Interceptação de requisições para cache offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Gerenciamento de notificações push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || 'Novo produto disponível!',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Ver agora'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Novidade no Desapego dos Martins', options)
  );
});

// Quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
