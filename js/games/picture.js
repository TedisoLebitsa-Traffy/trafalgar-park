/* Picture Game: two players -> category draw -> one locked category per duel.
   Photos and illustrated atlas cells are sent as anonymous Blobs, never answer-bearing paths. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc,D=window.TPData;
const CATS=[];
let MANIFEST={},manifestReady=false;
const GROUPS=[
  ['World & everyday',['Animals','Birds','Food','Fruits','Vegetables','Nature','Insects','Landmarks','Tools','Vehicles','Chemical Symbols','K53 Road Signs','Indigenous African Games','Musical Instruments','Flags','Maths']],
  ['Shows & films',['Anime Shows','Cartoon Shows','Kids Cartoons','Movies','Animated Movies','TV Shows']],
  ['Characters & games',['Anime Characters','Cartoon Characters','Superheroes','Movie Characters','Movie Villains','Video Games','Video Game Characters','Disney Characters','Pixar Characters','Fictional Creatures']],
  ['Sport',['Current Footballers','Retired Footballers','Athletes','Sports Equipment']]
];
function deckCat(id,name,items,deckName){
  const deck=new TP.Deck(items,deckName,i=>i.k);
  return{id,name,icon:'',count:()=>deck.size,make:()=>deck.draw(),deck};
}
function picCat(name){
  const files=(MANIFEST[name]||[]).map((f,i)=>({c:'p:'+name,k:'pic:'+name+'/'+(f.file||f.atlas+':'+f.cell),file:f.file,atlas:f.atlas,cell:f.cell,a:f.answer,alt:f.alt||'',cat:name}));
  const c=deckCat('p:'+name,name,files,'dPic_'+name);c.pictures=true;return c;
}
function buildCats(){
  CATS.length=0;
  CATS.push(deckCat('flags','Flags',D.flags.map(f=>({c:'flags',k:'flag:'+f[1],code:f[1],a:f[0],alt:f[2]||''})),'dFlags'));
  CATS.push({id:'maths',name:'Maths',icon:'',count:()=>9999,make(S){
    let it,tries=0;
    do{it=TP.mathgen.picture();it.c='maths';tries++;}while(S.seen.includes(it.k)&&tries<60);
    S.seen.push(it.k);return it;
  }});
  Object.keys(MANIFEST).sort().forEach(n=>{if(!/^PLACEHOLDER/i.test(n))CATS.push(picCat(n));});
}
async function loadManifest(){
  manifestReady=false;
  try{
    const r=await fetch('assets/pictures/manifest.json?'+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('manifest unavailable');
    MANIFEST=await r.json();buildCats();manifestReady=true;
  }catch(e){App.toast('Picture categories could not load. Reopen the game when your offline download is ready.');}
}
buildCats();
TP.picturesReady=loadManifest();
TP.pictureCats=()=>CATS;
const available=()=>CATS.filter(c=>c.count()>0);
const byId=id=>CATS.find(c=>c.id===id);
const catName=id=>(byId(id)||{}).name||id;
const eligible=o=>available().filter(c=>!Array.isArray(o.eligible)||o.eligible.includes(c.id));
function pickCategory(o,avoid){
  let pool=eligible(o);if(pool.length>1&&avoid)pool=pool.filter(c=>c.id!==avoid);
  return pool.length?pool[TP.secureInt(pool.length)].id:null;
}
function newOptions(){return{stage:'players',category:null,eligible:null,roll:null};}
function confirmPlayers(S){
  const names=S.f.map(n=>String(n||'').trim());
  if(names.some(n=>!n)){App.toast('Enter both player names first');return;}
  if(names[0].toLowerCase()===names[1].toLowerCase()){App.toast('Use two different player names');return;}
  S.names=names;S.f=names.slice();S.opts.stage='category';S.opts.category=null;S.opts.roll=null;
}
function grouped(){
  const seen=new Set();const groups=GROUPS.map(([name,names])=>({name,cats:names.map(n=>CATS.find(c=>c.name===n)).filter(c=>{if(c)seen.add(c.id);return c;})}));
  const custom=CATS.filter(c=>!seen.has(c.id));if(custom.length)groups.push({name:'More categories',cats:custom});
  return groups.filter(g=>g.cats.length);
}
function stepper(stage){
  const step=stage==='players'?0:stage==='ready'?2:1;
  return '<ol class="picture-steps" aria-label="Duel setup">'+['Players','Randomize category','Face off'].map((n,i)=>'<li class="'+(i===step?'current':i<step?'done':'')+'"'+(i===step?' aria-current="step"':'')+'><span>'+(i+1)+'</span>'+n+'</li>').join('')+'</ol>';
}
function categoryColumns(S){
  const o=S.opts,pool=new Set(eligible(o).map(c=>c.id));
  return '<div class="picture-columns">'+grouped().map(g=>'<section class="picture-column"><h4>'+esc(g.name)+'</h4><div class="picture-category-list">'+g.cats.map(c=>
    '<button class="picture-category '+(pool.has(c.id)?'included':'')+'" data-cmd="cat" data-arg="'+esc(c.id)+'" aria-pressed="'+pool.has(c.id)+'"'+(c.count()?'':' disabled')+'><span>'+esc(c.name)+'</span><small>'+(!c.count()?'Coming soon':c.id==='maths'?'Generated':c.count()+' clues')+'</small></button>'
  ).join('')+'</div></section>').join('')+'</div>';
}
// Legacy tournament options and saved duels are upgraded to one category, chosen once.
function normalize(S){
  const old=S.opts||{},o=Object.assign(newOptions(),old);
  if(!('eligible' in old)&&old.mixed===false&&Array.isArray(old.cats))o.eligible=old.cats.filter(id=>byId(id)&&byId(id).count()>0);
  if(o.category&&!byId(o.category)?.count())o.category=null;
  if(S.phase==='play'||S.phase==='ready'){
    if(!o.category&&byId(S.cur?.c)?.count())o.category=S.cur.c;
    if(!o.category){o.category=pickCategory(o);if(!o.category){o.eligible=null;o.category=pickCategory(o);}}
    o.stage='ready';o.roll=null;
  }
  if(o.stage==='drawing'&&!o.roll)o.stage='category';
  delete o.mixed;delete o.cats;S.opts=o;
}
/* decoding a 3 MB atlas takes ~1 s, so decode each sheet once and crop every clue from it */
const atlasCache=new Map();
function atlasImage(name){
  if(atlasCache.has(name))return atlasCache.get(name);
  const p=(async()=>{
    const blob=await TP.loadImage('assets/clue-atlases/'+name,{maxPx:0});
    if(typeof createImageBitmap==='function')return createImageBitmap(blob);
    const image=new Image(),url=URL.createObjectURL(blob);image.src=url;
    try{await image.decode();}finally{URL.revokeObjectURL(url);}
    return image;
  })();
  atlasCache.set(name,p);
  p.catch(()=>atlasCache.delete(name));
  while(atlasCache.size>3){const old=atlasCache.keys().next().value;atlasCache.delete(old);}
  return p;
}
async function atlasClue(it){
  const image=await atlasImage(it.atlas);
  const width=(image.width||image.naturalWidth)/3,height=(image.height||image.naturalHeight)/2;
  const canvas=document.createElement('canvas');canvas.width=Math.round(width);canvas.height=Math.round(height);
  canvas.getContext('2d').drawImage(image,(it.cell%3)*width,Math.floor(it.cell/3)*height,width,height,0,0,canvas.width,canvas.height);
  const clue=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
  if(!clue)throw new Error('Could not prepare illustration');return clue;
}
const cfg={
  id:'picture',name:'Picture Game',icon:'',plainUI:true,waitForImage:true,desc:'Two players. One random category.',
  rules:'Enter two players, randomize a category, then face off. The category stays locked for the whole duel.',
  opts:newOptions,
  fullSetupHost(S){
    const o=S.opts,stage=o.stage;
    let html=stepper(stage);
    if(stage==='players')return html+H.sec('Choose your two players','<div class="hgrid2">'+H.field('Player 1','n1',S.f[0],'First player',24)+H.field('Player 2','n2',S.f[1],'Second player',24)+'</div>'+H.row(H.btn('Continue to categories','players',undefined,'green',{form:1}))+H.note('Both players share one category. Each gets a 60-second clock.'));
    html+=H.sec('The matchup','<div class="picture-matchup"><b>'+esc(S.names[0])+'</b><span>vs</span><b>'+esc(S.names[1])+'</b></div>'+H.row(H.btn('Change players','editPlayers',undefined,'ghost')));
    if(stage==='drawing')return html+H.sec('Drawing a category','<div class="picture-drawing" role="status">Shuffling the categories…</div>'+H.note('The clocks have not started.'));
    if(stage==='ready')html+=H.sec('Your category','<div class="picture-selected" role="status">'+esc(catName(o.category))+'</div>'+H.note('Locked for this duel. Correct, Skip and Next all stay in this category.')+H.row(H.btn('Start duel','start',undefined,'green')+H.btn('Randomize again','randomize',undefined,'ghost')));
    const count=eligible(o).length;
    html+=H.sec(stage==='ready'?'Category pool':'Randomize a category',H.note('Include the categories you want in the draw. One category will be chosen for both players.')+
      '<div class="picture-pool-actions">'+H.btn(stage==='ready'?'Draw another category':'Randomize category','randomize',undefined,'gold',{dis:!manifestReady||count===0})+'<span>'+count+' eligible</span>'+H.btn('Include all','pool','all','ghost')+H.btn('Clear all','pool','none','ghost')+'</div>'+categoryColumns(S));
    return html;
  },
  setupView(S){
    const o=S.opts,base={kind:'scene',top:{title:'Picture Game'},blocks:[],btns:[]};
    if(o.stage==='players')base.blocks=[{t:'text',cls:'picture-kicker',x:'STEP 1 / PLAYERS'},{t:'text',cls:'q',x:'Who is facing off?'},{t:'text',cls:'info',x:'The host is choosing two players.'}];
    else{
      base.blocks.push({t:'text',cls:'picture-kicker',x:S.names[0]+' vs '+S.names[1]});
      if(o.stage==='ready'){
        base.blocks.push({t:'text',cls:'picture-kicker',x:'YOUR CATEGORY'},{t:'text',cls:'q',x:catName(o.category)},{t:'text',cls:'info',x:'One category. Two 60-second clocks. Correct passes the turn.'});
        base.btns=[{cmd:'start',label:'Start duel',cls:'green',key:'Space'}];
      }else if(o.stage==='drawing')base.blocks.push({t:'text',cls:'q picture-drawing',x:'Shuffling the categories…'},{t:'text',cls:'info',x:'Both clocks are paused.'});
      else base.blocks.push({t:'text',cls:'q',x:'Which category will it be?'},{t:'text',cls:'info',x:'The host will randomize one category for this duel.'});
    }
    return base;
  },
  setupCmd(S,name,arg){
    const o=S.opts;
    if(name==='players'){if(o.stage==='players')confirmPlayers(S);return;}
    if(name==='editPlayers'){o.stage='players';o.category=null;o.roll=null;return;}
    if(name==='randomize'){
      if(!manifestReady){App.toast('Wait for the picture categories to load');return;}
      if(!['category','ready'].includes(o.stage))return;
      const id=pickCategory(o,o.category||App.memGet('pictureLastCategory',null));
      if(!id){App.toast('Include at least one category in the draw');return;}
      o.category=null;o.stage='drawing';o.roll={category:id,ends:Date.now()+1400};App.sfx('tick');return;
    }
    if(name==='cat'||name==='pool'){
      if(!['category','ready'].includes(o.stage))return;
      if(name==='pool')o.eligible=arg==='all'?null:[];
      else{
        if(!byId(arg)?.count())return;
        const ids=eligible(o).map(c=>c.id),at=ids.indexOf(arg);
        if(at<0)ids.push(arg);else ids.splice(at,1);o.eligible=ids;
      }
      o.category=null;o.stage='category';o.roll=null;return;
    }
    if(name==='start'||name==='toggle'){
      if(o.stage==='players'){confirmPlayers(S);return;}
      if(o.stage==='category'){cfg.setupCmd(S,'randomize');return;}
      if(o.stage==='drawing')return;
      return false;
    }
    return false;
  },
  setupTick(S){
    const o=S.opts;
    if(o.stage!=='drawing'||!o.roll||Date.now()<o.roll.ends)return false;
    if(!byId(o.roll.category)?.count()){o.stage='category';o.roll=null;return true;}
    o.category=o.roll.category;o.roll=null;o.stage='ready';App.memSet('pictureLastCategory',o.category);App.sfx('ok');return true;
  },
  canStart(S){return manifestReady&&S.opts.stage==='ready'&&byId(S.opts.category)?.count()?null:'Randomize a category before starting the duel';},
  onPreset:normalize,
  onLoad(S){
    normalize(S);
    if(S.cur&&(!byId(S.cur.c)?.count()||S.cur.c!==S.opts.category))S.cur=cfg.draw(S);
  },
  rematchSetup(prev){return Object.assign(newOptions(),{stage:'category',eligible:prev.opts.eligible});},
  hostExtra(S){return H.sec('Locked category',H.note('<b>'+esc(catName(S.opts.category))+'</b> · '+esc(S.names[0])+' vs '+esc(S.names[1])+'<br>This category stays the same until the duel ends.'));},
  draw(S){
    const c=byId(S.opts.category);
    if(!c||!c.count())throw new Error('No locked Picture Game category');
    const it=c.make(S);it.c=c.id;return it;
  },
  prepare(it){
    if(it.c==='flags')return TP.loadImage('assets/flags/'+it.code+'.svg');
    if(it.c==='maths')return Promise.resolve(TP.svgBlob(TP.mathgen.pictureSVG(it)));
    if(it.atlas)return atlasClue(it);
    if(it.file)return TP.loadImage('assets/pictures/'+it.cat+'/'+it.file);
    return Promise.resolve(null);
  },
  clue(it,ctx){
    const b=[{t:'chip',x:catName(it.c)}];
    if(ctx.img)b.push({t:'img',id:'picture-'+ctx.S.uid,blob:ctx.img,cls:it.c==='flags'?'flag':it.c==='maths'?'sum':''});
    else b.push({t:'text',cls:'info',x:ctx.error?'Picture unavailable. The host can retry or skip it.':'Loading picture…'});
    if(ctx.shown)b.push({t:'text',cls:'ans',x:it.c==='maths'?String(it.ans):it.a});return b;
  },
  answer(it){return{label:'Answer',val:it.c==='maths'?String(it.ans):it.a,sub:catName(it.c)+(it.alt?' · also: '+it.alt:'')};}
};
App.register(TP.makeDuel(cfg));
})();
