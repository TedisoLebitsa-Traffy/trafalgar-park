/* Trafalgar Park - shared core (loaded by BOTH index.html and admin.html).
   Contains NO game content and no answers. */
(function(){
'use strict';
const TP=window.TP=window.TP||{};
TP.$=(s,r)=>(r||document).querySelector(s);
TP.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
TP.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
TP.shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
TP.rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
TP.pick=a=>a[Math.floor(Math.random()*a.length)];
/* cryptographically secure unbiased integer in [0,n) (used by the wheel and Number Hunt) */
TP.secureInt=function(n){
  const lim=Math.floor(4294967296/n)*n,a=new Uint32Array(1);
  do{crypto.getRandomValues(a);}while(a[0]>=lim);
  return a[0]%n;
};
TP.secureShuffle=function(arr){arr=arr.slice();for(let i=arr.length-1;i>0;i--){const j=TP.secureInt(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
TP.fmtT=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};

/* ---------- Settings (shared between display and admin through localStorage) ---------- */
const DEF={mute:false,adapt:false,hideBtns:false};
const subs=[];
TP.settings={
  get(k){try{const v=localStorage.getItem('tp_'+k);return v===null?DEF[k]:v==='1';}catch(e){return DEF[k];}},
  set(k,v){try{localStorage.setItem('tp_'+k,v?'1':'0');}catch(e){} this._mem[k]=v; subs.forEach(f=>f(k,v));},
  toggle(k){this.set(k,!this.get(k));},
  on(f){subs.push(f);},
  _mem:{}
};
window.addEventListener('storage',e=>{
  if(e.key&&e.key.startsWith('tp_')&&DEF.hasOwnProperty(e.key.slice(3))){const k=e.key.slice(3);subs.forEach(f=>f(k,TP.settings.get(k)));}
});
TP.isSmall=()=>Math.min(window.innerWidth,window.innerHeight)<720;
TP.applySettings=function(){
  document.documentElement.classList.toggle('adapt',TP.settings.get('adapt')||TP.isSmall());
  document.documentElement.classList.toggle('hidebtns',TP.settings.get('hideBtns'));
  const a=document.getElementById('app');if(a)a.classList.toggle('hidebtns',TP.settings.get('hideBtns'));
};
TP.settings.on(()=>TP.applySettings());
window.addEventListener('resize',()=>TP.applySettings());

/* ---------- Message bus ----------
   Same browser: BroadcastChannel (+ localStorage fallback).  Other devices: WebRTC data channels added with TP.bus.addPeer()
   (see js/pair.js). Messages are plain objects; Blobs (pictures) travel as data: URLs over a peer link, once per picture id. */
TP.bus=(function(){
  const NAME='trafalgar-park-v2', LS='tp_bus_msg';
  const NOBC=/[?&]nobc/.test(location.search);               // testing only: use the phone-to-phone link exclusively
  let bc=null, handlers=[], n=0;
  const mode=NOBC?'rtc':(('BroadcastChannel' in window)?'bc':'ls');
  const peers=[], peerSubs=[];
  const deliver=m=>handlers.forEach(h=>{try{h(m);}catch(e){console.error(e);}});
  if(mode==='bc'){bc=new BroadcastChannel(NAME);bc.onmessage=e=>deliver(e.data);}
  else if(mode==='ls')window.addEventListener('storage',e=>{
    if(e.key!==LS||!e.newValue)return;
    try{deliver(JSON.parse(e.newValue).m);}catch(_){}
  });
  // Blobs cannot go through JSON: convert them to data: URLs. A picture with an `id` already sent to this peer is not sent again.
  function prepare(o,sent){
    const jobs=[];
    (function walk(x){
      if(!x||typeof x!=='object')return;
      for(const k of Object.keys(x)){
        const v=x[k];
        if(v instanceof Blob){
          if(sent&&typeof x.id==='string'){ if(sent.has(x.id)){x[k]=null;continue;} sent.add(x.id); }
          jobs.push(new Promise(r=>{const fr=new FileReader();fr.onload=()=>{x[k]=null;x.dataUrl=fr.result;r();};fr.readAsDataURL(v);}));
        }else walk(v);
      }
    })(o);
    return Promise.all(jobs);
  }
  const CH=14000;
  function frames(str,id){
    if(str.length<=CH)return['0'+str];
    const out=[],tot=Math.ceil(str.length/CH);
    for(let i=0;i<tot;i++)out.push('1'+id+'|'+i+'|'+tot+'|'+str.slice(i*CH,(i+1)*CH));
    return out;
  }
  function addPeer(dc){
    const p={dc,sent:new Set(),rx:new Map(),q:Promise.resolve(),id:0};
    dc.onmessage=e=>{
      const d=e.data;if(typeof d!=='string')return;
      try{
        if(d[0]==='0')deliver(JSON.parse(d.slice(1)));
        else{
          const [id,i,tot,...rest]=d.slice(1).split('|'),chunk=rest.join('|');
          let r=p.rx.get(id);if(!r){r={parts:[],got:0};p.rx.set(id,r);}
          r.parts[+i]=chunk;r.got++;
          if(r.got===+tot){p.rx.delete(id);deliver(JSON.parse(r.parts.join('')));}
        }
      }catch(err){console.warn('bad peer message',err);}
    };
    const gone=()=>{const i=peers.indexOf(p);if(i>=0){peers.splice(i,1);peerSubs.forEach(f=>f(peers.length));}};
    dc.onclose=gone;dc.onerror=gone;
    dc.addEventListener('open',()=>peerSubs.forEach(f=>f(peers.filter(q=>q.dc.readyState==='open').length)));
    peers.push(p);peerSubs.forEach(f=>f(peers.length));
    return p;
  }
  return{
    mode,
    on(h){handlers.push(h);},
    addPeer,
    peerCount:()=>peers.filter(p=>p.dc.readyState==='open').length,
    onPeers(f){peerSubs.push(f);},
    send(msg){
      if(mode==='bc'){try{bc.postMessage(msg);}catch(e){console.warn('bus send failed',e);}}
      else if(mode==='ls'){
        const copy=structuredClone(msg);
        prepare(copy).then(()=>{try{localStorage.setItem(LS,JSON.stringify({n:++n+Math.random(),m:copy}));}catch(e){console.warn('ls bus failed',e);}});
      }
      peers.forEach(p=>{
        if(p.dc.readyState!=='open')return;
        let copy;try{copy=structuredClone(msg);}catch(e){return;}
        p.q=p.q.then(()=>prepare(copy,p.sent)).then(()=>{
          const str=JSON.stringify(copy);
          frames(str,String(++p.id)).forEach(f=>{
            if(p.dc.bufferedAmount>1000000)return;           // never let a stalled link pile up memory
            try{p.dc.send(f);}catch(e){}
          });
        }).catch(()=>{});
      });
    }
  };
})();

/* keep the screen awake while a game is running (phones lock otherwise and the link would drop) */
TP.keepAwake=function(){
  let lock=null;
  const get=async()=>{try{if('wakeLock' in navigator&&document.visibilityState==='visible')lock=await navigator.wakeLock.request('screen');}catch(e){}};
  document.addEventListener('visibilitychange',get);
  document.addEventListener('click',()=>{if(!lock||lock.released)get();});
  get();
};

/* ---------- Sound effects (Web Audio synth, same sounds as the original app) ---------- */
TP.sfx=(function(){
  let ctx=null, unlocked=false;
  const c=()=>{if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx;};
  function tone(f,type,dur,vol,delay){
    if(TP.settings.get('mute'))return;
    try{
      const a=c(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);
      o.type=type;o.frequency.setValueAtTime(f,t);
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+0.02);
    }catch(e){}
  }
  const S={
    tick:()=>tone(900,'square',.06,.08),
    ok:()=>{tone(880,'sine',.15,.25);tone(1320,'sine',.25,.25,.1);},
    buzz:()=>{tone(110,'sawtooth',.5,.35);tone(90,'sawtooth',.5,.3,.05);},
    win:()=>{[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,'sine',.28,.28,i*.14));},
    end:()=>{tone(440,'triangle',.3,.3);tone(330,'triangle',.5,.3,.25);},
    pop:()=>tone(660,'sine',.08,.2)
  };
  return{
    play(n){if(S[n])S[n]();},
    unlock(){try{c();unlocked=true;}catch(e){}},
    isUnlocked:()=>unlocked&&ctx&&ctx.state==='running'
  };
})();

/* ---------- Confetti (draws on the canvas inside #app) ---------- */
let confettiRun=0;
TP.confetti=function(ms){
  ms=ms||4500;
  const cv=document.getElementById('confetti'),app=document.getElementById('app');
  if(!cv||!app)return;
  try{
    const run=++confettiRun,r=app.getBoundingClientRect();cv.width=r.width;cv.height=r.height;
    const g=cv.getContext('2d'),cols=['#800020','#0B1F4B','#1E9BE0','#D9A21B','#ffffff','#15803D'];
    const P=Array.from({length:190},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.7,w:6+Math.random()*8,h:10+Math.random()*10,
      vx:(Math.random()-.5)*4,vy:2+Math.random()*4,rot:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.floor(Math.random()*cols.length)]}));
    const t0=performance.now();cv.style.display='block';
    (function f(t){
      if(run!==confettiRun)return;
      const el=t-t0;g.clearRect(0,0,cv.width,cv.height);
      P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.rot+=p.vr;
        g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.fillStyle=p.c;g.globalAlpha=Math.max(0,Math.min(1,(ms-el)/800));g.fillRect(-p.w/2,-p.h/2,p.w,p.h);g.restore();});
      if(el<ms)requestAnimationFrame(f);else{g.clearRect(0,0,cv.width,cv.height);cv.style.display='none';}
    })(t0);
  }catch(e){}
};

/* ---------- Keyboard shortcuts (shared map) ---------- */
TP.SHORTCUTS=[
  ['Space','Start / pause'],['C','Correct'],['S','Skip'],['X','Incorrect / Taboo'],['N','Next'],
  ['W','Spin the wheel (Number Hunt)'],['O','Bottle Blind: show / hide the order to the audience'],['Enter','Bottle Blind: confirm a swap'],['A-D then 1-4','Number Hunt: call a cell, e.g. D then 2'],['H','Hide / show on-screen host buttons'],['M','Mute / unmute'],['F','Fullscreen'],['Esc','Back (press twice to leave a running game)'],['?','This help']
];
TP.keyToCmd=function(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return null;
  const t=e.target&&e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(e.target&&e.target.isContentEditable))return null;
  const k=e.key;
  if(k===' ')return'toggle';
  if(k==='Escape')return'back';
  if(k==='?'||(k==='/'&&e.shiftKey))return'help';
  if(/^[abd]$/i.test(k))return'col:'+k.toUpperCase();
  if(/^[1-6]$/.test(k))return'row:'+k;
  if(k==='Enter')return'confirm';
  switch(k.toLowerCase()){
    case'w':return'spin';
    case'o':return'order';
    case'c':return'correct';case's':return'skip';case'x':return'incorrect';case'n':return'next';
    case'h':return'hideBtns';case'm':return'mute';case'f':return'fullscreen';
  }
  if(/^[a-z]$/i.test(k))return'ch:'+k.toUpperCase();
  return null;
};
TP.toggleFullscreen=function(){
  try{
    if(document.fullscreenElement)document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }catch(e){}
};
TP.helpHTML=function(){
  return '<div class="panel"><h2>Keyboard shortcuts</h2><div class="kv">'+TP.SHORTCUTS.map(s=>'<kbd>'+s[0]+'</kbd><span>'+s[1]+'</span>').join('')+'</div><p style="margin-top:.8em;text-align:center"><button class="btn small" data-act="closeHelp">Close</button></p></div>';
};
/* Local-only shortcuts that work identically on both pages. Returns true if handled. */
TP.localKey=function(cmd){
  switch(cmd){
    case'hideBtns':TP.settings.toggle('hideBtns');return true;
    case'mute':TP.settings.toggle('mute');return true;
    case'fullscreen':TP.toggleFullscreen();return true;
    case'help':{const h=document.getElementById('help');if(h)h.classList.toggle('show');return true;}
  }
  return false;
};
TP.applySettings();
/* offline: a service worker keeps every file so the game runs with no internet (needs https or localhost) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!/[?&](preview|nosw)/.test(location.search))
  navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
