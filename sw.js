// مهام لمح — Service Worker (v10)
const CACHE='lam7-v12';
const SDK='lam7-sdk-v1';          // مكتبات Firebase (ملفات ثابتة بإصدار محدد — آمنة للكاش)
const STATIC=['./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==SDK).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// شبكة أولاً بمهلة قصيرة، ولو بطيئة/مقطوعة نرجع للكاش — يفتح فورًا حتى بنت ضعيف أو بدون نت
function networkFirst(req,ms){
  return new Promise(resolve=>{
    let done=false;
    const fallback=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./index.html')).then(r=>r||caches.match('./'));
    const t=setTimeout(()=>{if(done)return;fallback().then(r=>{if(r&&!done){done=true;resolve(r);}});},ms);
    fetch(req,{cache:'no-cache'}).then(res=>{
      clearTimeout(t);
      if(res&&res.status===200){const copy=res.clone();caches.open(CACHE).then(c=>{c.put('./index.html',copy.clone()).catch(()=>{});c.put(req,copy).catch(()=>{});});}
      if(!done){done=true;resolve(res);}
    }).catch(()=>{
      clearTimeout(t);
      if(done)return;
      fallback().then(r=>{done=true;resolve(r||new Response('أوف لاين',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}));});
    });
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // صفحة التطبيق
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(networkFirst(req,3000));
    return;
  }

  // مكتبات Firebase من gstatic (إصدار ثابت) — كاش أولاً: أسرع فتح + تشتغل أوف لاين
  if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/')){
    e.respondWith(
      caches.open(SDK).then(c=>c.match(req).then(hit=>hit||fetch(req).then(res=>{
        if(res&&res.status===200)c.put(req,res.clone());
        return res;
      })))
    );
    return;
  }

  // أي طلبات خارجية (Firestore / Auth / Google) — مباشرة من الشبكة، لا تدخل الكاش
  if(url.origin!==self.location.origin)return;

  // ملفات التطبيق الثابتة: كاش أولاً مع تحديث بالخلفية
  e.respondWith(
    caches.match(req).then(hit=>{
      const net=fetch(req).then(res=>{
        if(res&&res.status===200)caches.open(CACHE).then(c=>c.put(req,res.clone()));
        return res;
      }).catch(()=>hit);
      return hit||net;
    })
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

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});
