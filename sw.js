/* Trafalgar Park service worker - keeps every file so the game works with no internet.
   VERSION and precache.json are rewritten by tools/build_sw.py (run it after changing files). */
const VERSION=/*V*/'tp-654e601f05'/*V*/;
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    const response=await fetch('precache.json',{cache:'reload'});
    if(!response.ok)throw new Error('Offline manifest unavailable');
    const manifest=await response.clone().json();
    if(manifest.version!==VERSION||!Array.isArray(manifest.files))throw new Error('Offline version mismatch');
    // A larger picture library must finish saving before this version activates.
    // Limit requests so phones and the local Python server are not overloaded.
    let next=0;
    await Promise.all(Array.from({length:6},async()=>{
      while(next<manifest.files.length){
        const file=manifest.files[next++];
        try{await c.add(new Request(file,{cache:'reload'}));}
        catch(err){await c.add(new Request(file,{cache:'reload'}));}
      }
    }));
    await c.put('precache.json',response);
    self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k.startsWith('tp-')&&k!==VERSION)await caches.delete(k);
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
