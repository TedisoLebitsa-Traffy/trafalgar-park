/* Trafalgar Park service worker - keeps every file so the game works with no internet.
   VERSION and precache.json are rewritten by tools/build_sw.py (run it after changing files). */
const VERSION=/*V*/'tp-6e954e0156'/*V*/;
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    let list=[];
    try{list=(await (await fetch('precache.json',{cache:'reload'})).json()).files;}catch(err){}
    await Promise.all(list.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==VERSION)await caches.delete(k);
    await self.clients.claim();
  })());
});
/* network first (always fresh when online), cache when offline or slow */
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(VERSION);
    const fromCache=()=>c.match(r,{ignoreSearch:true});
    try{
      const res=await Promise.race([fetch(r),new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),2500))]);
      if(res&&res.ok)c.put(r,res.clone()).catch(()=>{});
      return res;
    }catch(err){
      const hit=await fromCache();
      if(hit)return hit;
      try{return await fetch(r);}catch(e2){return new Response('Offline and not saved yet',{status:503});}
    }
  })());
});
