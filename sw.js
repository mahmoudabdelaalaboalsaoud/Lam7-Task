const CACHE = 'lam7-v5';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // كل حاجة مش من نفس الدومين — خليها تعدي بدون تدخل
  if (!e.request.url.startsWith(self.location.origin)) {
    return; // Firebase, Google APIs, etc. — مش بنلمسها
  }
  // ملفات التطبيق فقط — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {title: 'مهام لمح', body: 'لديك مهمة'};
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
    dir: 'rtl', lang: 'ar', vibrate: [300, 100, 300], tag: data.tag || 'lam7', renotify: true
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type: 'window'}).then(cs => {
    if (cs.length) return cs[0].focus();
    return clients.openWindow('/');
  }));
});
