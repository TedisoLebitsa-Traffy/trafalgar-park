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
TP.applySettings=function(){
  document.documentElement.classList.toggle('adapt',TP.settings.get('adapt'));
  document.documentElement.classList.toggle('hidebtns',TP.settings.get('hideBtns'));
  const a=document.getElementById('app');if(a)a.classList.toggle('hidebtns',TP.settings.get('hideBtns'));
};
TP.settings.on(()=>TP.applySettings());

/* ---------- Message bus: BroadcastChannel (+ localStorage fallback) ---------- */
TP.bus=(function(){
  const NAME='trafalgar-park-v2', LS='tp_bus_msg';
  let bc=null, handlers=[], n=0;
  const mode=('BroadcastChannel' in window)?'bc':'ls';
  if(mode==='bc'){bc=new BroadcastChannel(NAME);bc.onmessage=e=>handlers.forEach(h=>h(e.data));}
  else window.addEventListener('storage',e=>{
    if(e.key!==LS||!e.newValue)return;
    try{const m=JSON.parse(e.newValue).m;handlers.forEach(h=>h(m));}catch(_){}
  });
  // Blobs cannot go through JSON, so the fallback converts them to data: URLs
  function blobsToData(o){
    const jobs=[];
    (function walk(x){
      if(!x||typeof x!=='object')return;
      for(const k of Object.keys(x)){
        const v=x[k];
        if(v instanceof Blob){jobs.push(new Promise(r=>{const fr=new FileReader();fr.onload=()=>{x[k]=null;x.dataUrl=fr.result;r();};fr.readAsDataURL(v);}));}
        else walk(v);
      }
    })(o);
    return Promise.all(jobs);
  }
  return{
    mode,
    on(h){handlers.push(h);},
    send(msg){
      if(mode==='bc'){try{bc.postMessage(msg);}catch(e){console.warn('bus send failed',e);}return;}
      const copy=structuredClone?structuredClone(msg):JSON.parse(JSON.stringify(msg));
      blobsToData(copy).then(()=>{try{localStorage.setItem(LS,JSON.stringify({n:++n+Math.random(),m:copy}));}catch(e){console.warn('ls bus failed',e);}});
    }
  };
})();

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
})();
