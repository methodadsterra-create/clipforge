const C='clipforge-v16',F=['./','index.html','style.css','app.js','manifest.json','icon.svg','favicon.svg','favicon-32.png','apple-touch-icon.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{
  if(e.request.url.endsWith('config.js')||e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
