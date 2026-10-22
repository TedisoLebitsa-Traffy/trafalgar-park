/* PICTURE GAME - duel format. Categories are chosen in admin (or Mixed). A category with no content is greyed out
   and skipped by Mixed. Built-in: Emoji Meaning, Flags, Maths, Bible Books, Cartoons & Anime.
   Picture folders (assets/pictures/<Category>/<Answer>.jpg) become categories through manifest.json. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc,D=window.TPData;

const CATS=[];       // [{id,name,icon,count(),make(S), kind}]
const PIC_DEFAULT=[['Landmarks','🏛️'],['Animals','🦁'],['Food','🍕'],['Nature','🌿']];
const PIC_ICON={Landmarks:'🏛️',Animals:'🦁',Food:'🍕',Nature:'🌿'};
let MANIFEST={};

/* ---- built-in categories ---- */
const emojiItems=D.emoji.items.map((r,i)=>({c:'emoji',k:'emoji:'+r[1].toLowerCase(),e:r[0],a:r[1],hint:r[2]||''}));
const flagItems=D.flags.map(f=>({c:'flags',k:'flag:'+f[1],code:f[1],a:f[0],alt:f[2]||''}));
const bibleItems=D.bible.items.map(r=>({c:'bible',k:'bible:'+r[1].toLowerCase()+':'+r[0],e:r[0],a:r[1]}));
const cartoonItems=D.cartoons.items.map(r=>({c:'cartoons',k:'cartoon:'+r[1].toLowerCase()+':'+r[0].slice(0,24),clue:r[0],a:r[1],hint:r[2]||''}));

function deckCat(id,name,icon,items,deckName){
  const deck=new TP.Deck(items,deckName,i=>i.k);
  return{id,name,icon,count:()=>deck.size,make:S=>deck.draw(),deck};
}
function mathsCat(){
  return{id:'maths',name:'Maths',icon:'➗',count:()=>9999,
    make(S){
      let it,tries=0;
      do{it=TP.mathgen.picture();it.c='maths';tries++;}while(S.seen.includes(it.k)&&tries<60);
      S.seen.push(it.k);return it;
    }};
}
function picCat(name){
  const files=(MANIFEST[name]||[]).map(f=>({c:'p:'+name,k:'pic:'+name+'/'+f.file,file:f.file,a:f.answer,cat:name}));
  const c=deckCat('p:'+name,name,PIC_ICON[name]||'🖼️',files,'dPic_'+name);
  c.pictures=true;return c;
}
function buildCats(){
  CATS.length=0;
  CATS.push(deckCat('emoji','Emoji Meaning','😀',emojiItems,'dEmoji'));
  CATS.push(deckCat('flags','Flags','🚩',flagItems,'dFlags'));
  CATS.push(mathsCat());
  CATS.push(deckCat('bible','Bible Books','📖',bibleItems,'dBible'));
  CATS.push(deckCat('cartoons','Cartoons & Anime','🎬',cartoonItems,'dCartoon'));
  const names=PIC_DEFAULT.map(p=>p[0]);
  Object.keys(MANIFEST).sort().forEach(n=>{if(!names.includes(n))names.push(n);});
  names.forEach(n=>CATS.push(picCat(n)));
}
async function loadManifest(){
  try{
    const r=await fetch('assets/pictures/manifest.json?'+Date.now(),{cache:'no-store'});
    MANIFEST=r.ok?await r.json():{};
  }catch(e){MANIFEST={};}
  buildCats();
}
buildCats();
TP.picturesReady=loadManifest();
TP.pictureCats=()=>CATS;

const nonEmpty=()=>CATS.filter(c=>c.count()>0);
const byId=id=>CATS.find(c=>c.id===id);
const catName=c=>(byId(c)||{}).name||c;

const cfg={
  id:'picture',name:'Picture Game',icon:'🖼️',desc:'Guess from the clue',
  rules:'Pick one or more categories (or Mixed). Categories with nothing in them yet are greyed out and skipped by Mixed.',
  opts:()=>({mixed:true,cats:[]}),
  setupHost(S){
    const o=S.opts;
    const chips='<button class="chip '+(o.mixed?'sel':'')+'" data-cmd="cat" data-arg="mixed">🎲 Mixed (all with content)</button>'+
      CATS.map(c=>'<button class="chip '+((!o.mixed&&o.cats.includes(c.id))?'sel':'')+'" data-cmd="cat" data-arg="'+esc(c.id)+'"'+(c.count()>0?'':' disabled title="No content yet"')+'>'+c.icon+' '+esc(c.name)+(c.pictures?' ('+c.count()+')':'')+'</button>').join('');
    return H.sec('Categories','<div class="chipsel">'+chips+'</div>'+
      H.row(H.btn('↻ Re-scan picture folders','rescan',undefined,'ghost'))+
      H.note('Real-picture categories read <code>assets/pictures/&lt;Category&gt;/&lt;Answer&gt;.jpg</code> (see README). Run <code>python tools/build_manifest.py</code> after adding pictures, then press Re-scan.'));
  },
  setupCmd(S,name,arg){
    const o=S.opts;
    if(name==='cat'){
      if(arg==='mixed'){o.mixed=true;o.cats=[];}
      else{o.mixed=false;const i=o.cats.indexOf(arg);if(i>=0)o.cats.splice(i,1);else o.cats.push(arg);if(!o.cats.length)o.mixed=true;}
      return;
    }
    if(name==='rescan'){loadManifest().then(()=>{App.toast('Picture folders re-scanned');App.publish();});return;}
    return false;
  },
  canStart(S){
    const pool=S.opts.mixed?nonEmpty():S.opts.cats.map(byId).filter(c=>c&&c.count()>0);
    return pool.length?null:'Pick a category that has content';
  },
  draw(S){
    const pool=S.opts.mixed?nonEmpty():S.opts.cats.map(byId).filter(c=>c&&c.count()>0);
    const c=TP.pick(pool.length?pool:nonEmpty());
    const it=c.make(S);it.c=c.id;return it;
  },
  prepare(it){
    if(it.c==='flags')return TP.loadImage('assets/flags/'+it.code+'.svg');
    if(it.c==='maths')return Promise.resolve(TP.svgBlob(TP.mathgen.pictureSVG(it)));
    if(it.file)return TP.loadImage('assets/pictures/'+it.cat+'/'+it.file);
    return Promise.resolve(null);
  },
  clue(it,ctx){
    const b=[];
    const cname=catName(it.c);
    b.push({t:'chip',x:cname+(it.hint?' · '+it.hint:'')+(it.c==='bible'?' · Which book of the Bible?':'')});
    if(it.c==='emoji'||it.c==='bible')b.push({t:'emoji',x:it.e});
    else if(it.c==='cartoons')b.push({t:'text',cls:'q',blur:1,x:it.clue});
    else if(ctx.img)b.push({t:'img',id:'i'+ctx.S.uid,blob:ctx.img,cls:it.c==='flags'?'flag':(it.c==='maths'?'sum':'')});
    else b.push({t:'emoji',x:'⏳',cls:'mid2'});
    if(ctx.shown)b.push({t:'text',cls:'ans',x:it.a});
    return b;
  },
  answer(it){
    const sub=catName(it.c)+(it.alt?' · also: '+it.alt:'')+(it.c==='cartoons'&&it.hint?' · '+it.hint:'');
    return{label:'Answer',val:it.c==='maths'?String(it.ans):it.a,sub};
  }
};
App.register(TP.makeDuel(cfg));
})();
