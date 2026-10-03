const CACHE='lam7-v9';
const STATIC=['./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim(); // take control immediately
});

self.addEventListener('fetch',e=>{
  const url=e.request.url;
  
  // HTML - دايماً من النت (مش من الكاش)
  if(e.request.destination==='document'||url.endsWith('/')||url.endsWith('.html')){
    e.respondWith(
      fetch(e.request,{cache:'no-cache'}).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  
  // Firebase & Google - network only
  if(url.includes('firebase')||url.includes('googleapis')||url.includes('gstatic')){
    e.respondWith(fetch(e.request).catch(()=>new Response('',{status:503})));
    return;
  }
  
  // باقي الملفات (أيقونات، manifest) - cache first
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200&&!url.includes('chrome-extension')){
        caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
      }
      return res;
    }).catch(()=>new Response('',{status:503})))
  );
});

self.addEventListener('push',e=>{
  const d=e.data?e.data.json():{title:'مهام لمح',body:'لديك مهمة'};
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'./icon-192.png',badge:'./icon-192.png',dir:'rtl',lang:'ar',vibrate:[300,100,300],tag:d.tag||'lam7',renotify:true}));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    if(cs.length)return cs[0].focus();
    return clients.openWindow('./');
  }));
});

// Force update message
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});
