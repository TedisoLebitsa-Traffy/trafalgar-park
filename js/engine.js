/* Trafalgar Park - ADMIN engine (loaded by admin.html only).
   The admin page owns ALL game state and ALL answers. It publishes "views" (what the audience
   may see) to the display page over TP.bus. Future viewer / chat integration can be added by
   calling App.cmd(...) from another input source - nothing here is tied to the buttons. */
(function(){
const TP=window.TP;

/* ---------- Non-repeating deck with de-duplication ---------- */
class Deck{
  static key(i){
    if(Array.isArray(i))return String(i[0]).toLowerCase();
    if(i&&typeof i==='object')return String(i.k!==undefined?i.k:(i.key!==undefined?i.key:i.id)).toLowerCase();
    return String(i).toLowerCase();
  }
  /** Returns the keys that appear more than once (used by the quality checks). */
  static dupes(items,keyFn){
    const kf=keyFn||Deck.key,seen=new Set(),d=[];
    items.forEach(i=>{const k=kf(i);if(seen.has(k))d.push(k);seen.add(k);});
    return d;
  }
  constructor(items,name,keyFn){
    this.keyFn=keyFn||Deck.key;
    const seen=new Set();this.items=[];
    items.forEach(i=>{const k=this.keyFn(i);if(!seen.has(k)){seen.add(k);this.items.push(i);}});   // de-duplicate pool
    this.byKey=new Map(this.items.map(i=>[this.keyFn(i),i]));
    this.q=[];this.name=name;
    if(name)App.decks[name]=this;
  }
  get size(){return this.items.length;}
  refill(){this.q=TP.shuffle(this.items);}
  snapshot(){return this.q.map(x=>this.keyFn(x));}
  restore(keys){if(Array.isArray(keys))this.q=keys.map(k=>this.byKey.get(k)).filter(x=>x!==undefined);}
  /** draw(avoid): avoid is an array of keys OR a predicate(item)->true when the item must not be used */
  draw(avoid){
    const bad=typeof avoid==='function'?avoid:(()=>{const s=new Set((avoid||[]).map(a=>String(a).toLowerCase()));return i=>s.has(this.keyFn(i));})();
    for(let pass=0;pass<2;pass++){
      if(!this.q.length)this.refill();
      for(let i=this.q.length-1;i>=0;i--){if(!bad(this.q[i]))return this.q.splice(i,1)[0];}
      this.q=[];
    }
    return this.items.find(i=>!bad(i))||this.items[0];
  }
}
TP.Deck=Deck;

/* ---------- Clock: timestamp based, so background-tab throttling can never make it drift ---------- */
class Clock{
  constructor(ms){this.ms=ms;this.run=false;this.t0=0;this.lastSec=null;}
  left(){return this.run?Math.max(0,this.ms-(performance.now()-this.t0)):this.ms;}
  start(){if(!this.run&&this.ms>0){this.run=true;this.t0=performance.now();}}
  pause(){if(this.run){this.ms=this.left();this.run=false;}}
  set(ms){this.ms=Math.max(0,ms);if(this.run)this.t0=performance.now();}
  add(d){const l=this.left();this.ms=Math.max(0,l+d);if(this.run)this.t0=performance.now();}
  view(extra){return Object.assign({ms:this.left(),run:this.run},extra||{});}
  done(){return this.left()<=0;}
  /** true once per whole second in the final `from` seconds (for the tick sound) */
  beep(from){
    const s=Math.ceil(this.left()/1000);
    if(!this.run){this.lastSec=null;return false;}
    if(s!==this.lastSec){this.lastSec=s;return s<=from&&s>0;}
    return false;
  }
}
TP.Clock=Clock;

/* ---------- Spin the Wheel: reusable for any two-player game ----------
   const w=TP.wheel.spin(2);  keep w in your state; show it with TP.wheel.block(w,names);
   call TP.wheel.tick(w) from your tick(): returns true once, when the wheel has just landed (sound + confetti done here).
   w.winner is the index of the chosen name. The choice uses crypto.getRandomValues. */
TP.wheel={
  SLICES:12,
  spin(n){
    n=n||2;
    const winner=TP.secureInt(n),k=winner+n*TP.secureInt(TP.wheel.SLICES/n),jit=TP.secureInt(15)-7;
    const mid=k*(360/TP.wheel.SLICES)+(180/TP.wheel.SLICES)+jit;
    return{id:Date.now()+'-'+TP.secureInt(1000000),winner,deg:360*(5+TP.secureInt(3))+(360-mid),t0:Date.now(),ms:4800,fin:false};
  },
  block(w,names){
    return{t:'wheel',names,slices:TP.wheel.SLICES,spin:w?{id:w.id,deg:w.deg,t0:w.t0,ms:w.ms}:null,winner:w&&w.fin?w.winner:null};
  },
  tick(w){
    if(w&&!w.fin&&Date.now()>=w.t0+w.ms){w.fin=true;App.sfx('win');App.confetti(3500);return true;}
    return false;
  },
  /* after a reload a spin that was in flight is simply treated as landed */
  resume(w){if(w)w.fin=true;}
};

/* ---------- Tiny HTML helpers for the host panel ---------- */
const esc=TP.esc;
TP.H={
  btn(label,cmd,arg,cls,opt){opt=opt||{};return '<button class="btn small '+(cls||'')+'" data-cmd="'+cmd+'"'+(arg!==undefined?' data-arg="'+esc(arg)+'"':'')+(opt.form?' data-form="1"':'')+(opt.dis?' disabled':'')+'>'+label+'</button>';},
  field(label,name,val,ph,maxlen){return '<label class="fld"><span>'+esc(label)+'</span><input class="inp" name="'+name+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'" maxlength="'+(maxlen||20)+'"></label>';},
  sec(title,html,cls){return '<section class="hsec '+(cls||'')+'"><h3>'+title+'</h3>'+html+'</section>';},
  row(html){return '<div class="hrow">'+html+'</div>';},
  ans(label,val,sub){return '<div class="hans"><div class="hk">'+esc(label)+'</div><div class="hv">'+esc(val)+'</div>'+(sub?'<div class="hs">'+esc(sub)+'</div>':'')+'</div>';},
  note(t){return '<p class="hnote">'+t+'</p>';}
};

/* ---------- Image helpers: everything the display shows as a picture is sent as a Blob,
   so no file name (which may be the answer!) ever reaches the display page ---------- */
const imgCache=new Map();
TP.loadImage=async function(path,opt){
  opt=opt||{};
  if(imgCache.has(path))return imgCache.get(path);
  const r=await fetch(path.split('/').map((p,i)=>i?encodeURIComponent(p):p).join('/'));
  if(!r.ok)throw new Error('missing '+path);
  let blob=await r.blob();
  if(!/svg/i.test(blob.type)&&!/\.svg$/i.test(path)&&opt.maxPx!==0){
    // shrink huge photos so the display receives something light
    try{
      const bmp=await createImageBitmap(blob),max=opt.maxPx||1280,sc=Math.min(1,max/Math.max(bmp.width,bmp.height));
      if(sc<1||blob.size>600000){
        const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
        cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
        blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.88));
      }
    }catch(e){}
  }else if(/\.svg$/i.test(path)&&blob.type!=='image/svg+xml'){blob=new Blob([blob],{type:'image/svg+xml'});}
  imgCache.set(path,blob);
  if(imgCache.size>40)imgCache.delete(imgCache.keys().next().value);
  return blob;
};
TP.svgBlob=svg=>new Blob([svg],{type:'image/svg+xml'});

/* ---------- Ticker: a Web Worker is not throttled when the admin window is in the background ---------- */
function startTicker(fn){
  try{
    const src='setInterval(function(){postMessage(1)},200)';
    const w=new Worker(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));
    w.onmessage=fn;return;
  }catch(e){}
  setInterval(fn,200);
}

/* ---------- The App: screens, command routing, publishing, autosave ---------- */
const SAVE_KEY='trafalgar_park_v2', MEM_KEY='trafalgar_park_mem_v2';
const App=window.App={
  screen:'intro', games:{}, order:[], game:null, snapOpen:false, decks:{}, mem:{}, backArm:0, ready:false,
  hooks:{},   // admin.js plugs in: hooks.render() redraws the host panel

  register(def){App.games[def.id]=def;App.order.push(def.id);},
  sfx(name){TP.bus.send({t:'sfx',name});},
  confetti(ms){TP.bus.send({t:'confetti',ms});},
  toast(text){TP.bus.send({t:'toast',text});if(App.hooks.toast)App.hooks.toast(text);},
  beep(clock,from){if(clock.beep(from||5))App.sfx('tick');},

  /* memory that survives between games (remembered names etc.) */
  memGet(k,d){return App.mem[k]!==undefined?App.mem[k]:d;},
  memSet(k,v){App.mem[k]=v;try{localStorage.setItem(MEM_KEY,JSON.stringify(App.mem));}catch(e){}},

  view(){
    if(App.screen==='intro')return{kind:'intro'};
    if(App.screen==='mode')return{kind:'hub',title:'Choose a mode',cmd:'mode',cards:[{id:'normal',icon:'🎮',name:'Normal',desc:'Pick any single game'},{id:'team',icon:'🏆',name:'Team Tournament',desc:'2 teams of 4 · 4 games'}]};
    if(App.screen==='hub')return{kind:'hub',backCmd:'mode',backLabel:'← Mode',cards:App.order.filter(id=>!App.games[id].hidden).map(id=>{const g=App.games[id];return{id,icon:g.icon,name:g.name,desc:g.desc};})};
    const v=App.game.view();
    v.snapAvail=!!((v.board&&v.board.length)||v.snapRoad);
    if(App.snapOpen&&v.snapAvail){
      if(v.snapRoad)v.snap={title:v.snapTitle||(v.top&&v.top.title)||'',sub:v.snapSub||'Road to the Final',road:v.snapRoad};
      else v.snap={title:(v.top&&v.top.title)||'',sub:v.snapSub||'',rows:v.board.map(e=>({name:e.name,score:e.score+(e.unit||''),n:e.n!==undefined?e.n:parseFloat(e.score)||0}))};
    }
    return v;
  },
  publish(){
    let v;
    try{v=App.view();}catch(e){console.error('view failed',e);return;}
    TP.bus.send({t:'view',view:v});
    if(App.hooks.render)App.hooks.render();
    App.save();
  },
  /* ---- navigation ---- */
  go(screen,gameId){
    if(App.game&&App.game.leave)App.game.leave();
    App.screen=screen;App.snapOpen=false;App.backArm=0;
    App.game=gameId?App.games[gameId]:null;
    if(App.game)App.game.open();
    App.publish();
  },
  /* ---- command router: display buttons, admin buttons, keyboard and (future) viewers all end up here ---- */
  cmd(name,arg){
    switch(name){
      case'key':return App.cmd(arg);
      case'play':return App.go('mode');
      case'mode':
        if(arg==='normal'){App.mode='normal';return App.go('hub');}
        if(arg==='team'){App.mode='team';return App.go('game','tournament');}
        return App.go('mode');
      case'intro':return App.go('intro');
      case'hub':
        if(App.screen==='game'&&App.game&&App.game.pre){const r=App.game.pre('hub');if(r!==undefined){App.publish();return;}}
        return App.go('hub');
      case'open':if(App.games[arg])return App.go('game',arg);return;
      case'snap':if(App.screen==='game'){App.snapOpen=!App.snapOpen;App.publish();}return;
      case'snapClose':App.snapOpen=false;App.publish();return;
      case'back':return App.back();
      case'mute':case'hideBtns':case'fullscreen':case'help':return TP.localKey(name);
    }
    if(App.screen==='intro'){if(name==='toggle'||name==='next')return App.go('mode');return;}
    if(App.screen==='hub'||App.screen==='mode'){return;}
    App.backArm=0;
    const r=App.game.cmd(name,arg);
    if(r!==false)App.publish();
  },
  back(){
    if(App.snapOpen){App.snapOpen=false;return App.publish();}
    if(App.screen==='intro')return;
    if(App.screen==='hub')return App.go('mode');
    if(App.screen==='mode')return App.go('intro');
    if(App.game.back&&App.game.back())return App.publish();
    if(App.game.active&&App.game.active()){
      const now=Date.now();
      if(now-App.backArm<2500){return App.leave();}
      App.backArm=now;
      if(App.game.pause)App.game.pause();
      App.toast('Press Esc again to leave this game');
      return App.publish();
    }
    App.leave();
  },
  /* leave the current game: games may handle one level themselves (the tournament goes match -> overview -> mode) */
  leave(){
    if(App.game&&App.game.exit&&App.game.exit()){App.publish();return;}
    App.go('hub');
  },
  exit(where){App.go(where);},
  tick(){
    if(App.screen!=='game'||!App.game||!App.game.tick)return;
    let ch=false;
    try{ch=App.game.tick();}catch(e){console.error(e);}
    if(ch)App.publish();
  },

  /* ---- autosave / resume ---- */
  save(){
    if(!App.ready)return;
    try{
      const o={v:2,screen:App.screen,gameId:App.game?App.game.id:null,t:Date.now()};
      if(App.game)o.state=App.game.save();
      o.decks={};Object.keys(App.decks).forEach(k=>o.decks[k]=App.decks[k].snapshot());
      localStorage.setItem(SAVE_KEY,JSON.stringify(o));
    }catch(e){}
  },
  peekSave(){
    try{
      const o=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
      if(o&&o.screen==='game'&&App.games[o.gameId]&&App.games[o.gameId].resumable&&App.games[o.gameId].resumable(o.state&&o.state.S?o.state.S:o.state))return o;
    }catch(e){}
    return null;
  },
  restore(o){
    try{
      Object.keys(o.decks||{}).forEach(k=>{if(App.decks[k])App.decks[k].restore(o.decks[k]);});
      App.screen='game';App.game=App.games[o.gameId];
      App.game.load(o.state);
    }catch(e){console.warn('restore failed',e);App.screen='hub';App.game=null;}
    App.publish();
  },
  clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}},

  init(){
    try{App.mem=JSON.parse(localStorage.getItem(MEM_KEY)||'{}')||{};}catch(e){App.mem={};}
    TP.bus.on(m=>{
      if(!m||!m.t)return;
      if(m.t==='hello'){TP.bus.send({t:'view',view:App.view()});}
      else if(m.t==='cmd'){App.cmd(m.cmd,m.arg);}
      else if(m.t==='hb'){App.seen[m.role]=Date.now();}
    });
    setInterval(()=>TP.bus.send({t:'hb',role:'admin'}),2000);
    startTicker(()=>App.tick());
    setInterval(()=>App.save(),1000);
    window.addEventListener('pagehide',()=>App.save());
  },
  seen:{}
};
})();
