/* BOTTLE BLIND - fully on screen. 6 colour-named bottles drawn as SVG. Each player has their own random hidden target order.
   Round flow (per player, and per tiebreaker round):
     1. HIDDEN  - the display shows "Get ready" and 6 neutral slots; the order is not in the view at all.
     2. SHOWN   - admin presses "Show order to audience" (O): the display shows the target (the blindfolded player cannot see it).
     3. PLAY    - admin presses "Hide order" (O): the order disappears from the display and only now are slots / swaps / Check unlocked.
   The host places the bottles the player calls, presses Check (= one attempt; display shows only "N of 6 in the correct place"),
   then rearranges with SWAPS (not attempts) and Checks again. Slots are never cleared between attempts.
   6/6 finishes the round; fewest attempts wins; a tie gets a tiebreaker round with new targets. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const IDS=TP.BOTTLES.map(b=>b.id);
const LETTER={B:'blue',K:'black',R:'red',G:'green',Y:'yellow',W:'white'};
const LETTER_OF=Object.fromEntries(Object.entries(LETTER).map(([k,v])=>[v,k]));
let S=null;

const empty=()=>Array(6).fill(null);
function targets(){
  let a,b;do{a=TP.shuffle(IDS);b=TP.shuffle(IDS);}while(a.join()===b.join());
  return[a,b];
}
function roundReset(){
  S.slots=empty();S.stage='hidden';S.sel=[];S.swapHist=[];S.swapN=0;S.anim=null;S.base=null;S.attArr=[[],[]];S.fin=false;
}
function openState(prev){
  S={phase:prev?'play':'setup',names:prev?prev.names.slice():['',''],f:prev?prev.names.slice():[App.memGet('bbA',''),App.memGet('bbB','')],
     p:0,targets:targets(),att:[[],[]],round:1,result:null,mode:App.memGet('bbMode','pos'),hostHide:false};
  roundReset();
}
const nm=i=>S.names[i];
const count=()=>S.slots.reduce((n,id,i)=>n+(id&&id===S.targets[S.p][i]?1:0),0);
const full=()=>!S.slots.includes(null);
const lastN=()=>{const a=S.att[S.p];return a.length?a[a.length-1]:null;};
const dirty=()=>!S.base||S.base.join()!==S.slots.join();
const stale=()=>lastN()!==null&&dirty();
const playing=()=>S.phase==='play'&&S.stage==='play'&&!S.fin;
function judge(){
  const a=S.att[0].length,b=S.att[1].length;
  if(a===b){ // tiebreaker: new targets, fresh attempts
    S.round++;S.targets=targets();S.att=[[],[]];S.p=0;roundReset();
    App.sfx('end');App.toast('🤝 Tie on '+a+' attempts! Tiebreaker round with new targets');return;
  }
  S.phase='over';S.result={w:a<b?0:1};App.sfx('win');App.confetti(6500);
}
function doSwap(){
  if(S.sel.length!==2)return false;
  let a,b;
  if(S.mode==='pos'){a=+S.sel[0]-1;b=+S.sel[1]-1;}
  else{a=S.slots.indexOf(S.sel[0]);b=S.slots.indexOf(S.sel[1]);}
  if(a<0||b<0||!S.slots[a]||!S.slots[b]){S.sel=[];return;}
  S.swapHist.push(S.slots.slice());if(S.swapHist.length>60)S.swapHist.shift();
  [S.slots[a],S.slots[b]]=[S.slots[b],S.slots[a]];
  S.swapN++;S.anim={id:S.swapN,a,b,t:Date.now()};S.sel=[];App.sfx('pop');
}
function select(v){
  if(!playing()||S.slots.includes(null))return false;                       // swaps need a full set of slots
  const i=S.sel.indexOf(v);
  if(i>=0)S.sel.splice(i,1);else if(S.sel.length<2)S.sel.push(v);else return false;
}

const G={
  id:'bottle',name:'Bottle Blind',icon:'🍾',desc:'Blindfolded · 6 bottles',
  open(){openState(null);},
  preset(names){openState(null);S.names=names.slice();S.f=names.slice();S.phase='play';},
  result(){return S&&S.phase==='over'?{w:S.result.w}:null;},
  active:()=>S&&S.phase==='play',
  resumable:s=>s&&s.phase==='play',
  field(n,v){if(n==='n1')S.f[0]=v;if(n==='n2')S.f[1]=v;},
  save(){return{S};},load(o){S=o.S;if(S.anim)S.anim.t=0;},
  back(){if(S&&S.sel&&S.sel.length){S.sel=[];return true;}return false;},

  cmd(name,arg){
    if(S.phase==='setup'){
      if(name==='start'||name==='toggle'){
        const a=(S.f[0]||'').trim()||'Player 1';let b=(S.f[1]||'').trim()||'Player 2';
        if(b.toLowerCase()===a.toLowerCase())b+=' (2)';
        App.memSet('bbA',(S.f[0]||'').trim());App.memSet('bbB',(S.f[1]||'').trim());
        S.names=[a,b];S.phase='play';App.sfx('ok');
      }
      return;
    }
    if(S.phase==='over'){
      if(name==='rematch'||name==='toggle'){openState(S);return;}
      return false;
    }
    switch(name){
      /* ---- reveal sequence ---- */
      case'order':case'showorder':
        if(S.fin)return false;
        if(S.stage==='hidden'){S.stage='shown';App.sfx('pop');break;}
        if(S.stage==='shown'){S.stage='play';S.sel=[];App.sfx('ok');break;}
        return false;                                                         // once play has started the order is never shown again
      case'eye':S.hostHide=!S.hostHide;break;
      /* ---- first placement ---- */
      case'place':{
        if(!playing()||lastN()!==null)return false;
        if(S.slots.includes(arg))return false;
        const i=S.slots.indexOf(null);if(i<0)return false;
        S.slots[i]=arg;App.sfx('pop');break;}
      case'clear':{ // click a placed bottle to take it out - first placement only
        if(!playing()||lastN()!==null)return false;
        S.slots[+arg]=null;break;}
      case'clearall':if(!playing()||lastN()!==null)return false;S.slots=empty();S.sel=[];break;
      /* ---- swaps ---- */
      case'swapmode':if(arg!=='pos'&&arg!=='col')return false;S.mode=arg;S.sel=[];App.memSet('bbMode',arg);break;
      case'sel':if(select(arg)===false)return false;break;
      case'swap':case'confirm':if(!playing()||S.sel.length!==2)return false;doSwap();break;
      case'undoswap':{
        if(!playing()||!S.swapHist.length)return false;
        S.slots=S.swapHist.pop();S.sel=[];S.anim=null;break;}
      case'clearsel':S.sel=[];break;
      /* ---- keyboard: digits (position mode) / colour letters (colour mode) ---- */
      default:{
        let v=null;
        if(/^row:[1-6]$/.test(name)&&S.mode==='pos')v=name[4];
        else if(S.mode==='col'){
          const L=name==='spin'?'W':(/^(col|ch):[A-Z]$/.test(name)?name[name.length-1]:(name==='correct'?'C':null));
          if(L&&LETTER[L])v=LETTER[L];
        }
        if(v!==null){if(select(v)===false)return false;break;}
        /* ---- check ---- */
        if(name==='check'||name==='toggle'){
          if(S.fin&&name==='toggle')return G.cmd('continue');
          if(!playing()||!full()||!dirty())return false;
          const n=count();S.att[S.p].push(n);S.attArr[S.p].push(S.slots.join());S.base=S.slots.slice();S.sel=[];
          if(n===6){S.fin=true;App.sfx('win');App.confetti(2500);App.toast('🎉 '+nm(S.p)+' got all 6 in '+S.att[S.p].length+' attempt'+(S.att[S.p].length>1?'s':'')+'!');}
          else App.sfx(n>0?'ok':'buzz');
          break;
        }
        if(name==='undocheck'){
          if(S.stage!=='play'||!S.att[S.p].length)return false;
          S.att[S.p].pop();S.attArr[S.p].pop();S.fin=false;S.sel=[];
          const prevArr=S.attArr[S.p];S.base=prevArr.length?prevArr[prevArr.length-1].split(',').map(x=>x||null):null;
          break;
        }
        if(name==='incorrect'){ // X = undo last placed bottle (first placement only)
          if(!playing()||lastN()!==null)return false;
          for(let i=5;i>=0;i--)if(S.slots[i]){S.slots[i]=null;break;}
          break;
        }
        if(name==='continue'||name==='next'){
          if(!S.fin)return false;
          if(S.p===0){S.p=1;roundReset();App.sfx('ok');}
          else judge();
          break;
        }
        return false;
      }
    }
  },

  view(){
    const top={title:'🍾 Bottle Blind'};
    if(S.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'info',br:1,x:'First the target order is shown to the audience only.\nThen it is hidden, and the blindfolded player calls out an order.\nAfter every check we only say HOW MANY are in the right place.\nGet all 6 right — the fewest attempts wins!'},{t:'lbl',x:'The host is choosing players…'}]};
    const p=S.p,n=S.att[p].length;
    const board=S.names.map((x,i)=>({name:x,sub:S.att[i].length&&S.att[i][S.att[i].length-1]===6?'✔ done':(S.round>1?'tiebreaker':''),score:S.att[i].length,unit:' tries',n:S.att[i].length,active:i===p&&S.phase==='play'}));
    const blocks=[{t:'bottles',target:S.stage==='shown'?S.targets[p]:null,who:nm(p),slots:S.slots,anim:S.anim}];
    if(S.stage==='hidden')blocks.push({t:'text',cls:'banner',style:'font-size:2.6em',x:'Get ready, '+nm(p)+'!'});
    else if(S.stage==='shown')blocks.push({t:'text',cls:'info',x:'🙈 Everyone remember the order – '+nm(p)+' cannot see it!'});
    else if(lastN()!==null)blocks.push({t:'big',cls:stale()?'grey':'',x:lastN()+' of 6 in the correct place'});
    else blocks.push({t:'lbl',x:'How many bottles are in the correct place?'});
    if(S.stage==='play'&&n)blocks.push({t:'chips',items:S.att[p].map(x=>({x:String(x),full:x===6}))});
    const v={kind:'scene',top:Object.assign({},top,{left:{k:'Now playing',v:nm(p)+(S.round>1?' · tiebreaker':'')},right:{k:'Attempts',v:String(n)}}),blocks,board,snapSub:'Attempts so far (fewest wins)',
      btns:S.fin?[{cmd:'continue',label:S.p===0?'Next player →':'Final result →',cls:'green',key:'N'}]:[]};
    if(S.phase==='over'){
      const w=S.result.w;
      v.modal={icon:'🍾',title:'Bottle Blind Over',winner:nm(w)+' Wins!',lines:[nm(0)+': '+S.att[0].length+' attempts ('+S.att[0].join(' → ')+')',nm(1)+': '+S.att[1].length+' attempts ('+S.att[1].join(' → ')+')'],
        btns:[{cmd:'rematch',label:'Rematch',cls:'green',key:'Space'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
    }
    return v;
  },

  host(){
    if(S.phase==='setup')return H.sec('Players',H.field('Player 1 name','n1',S.f[0],'Player 1',18)+H.field('Player 2 name','n2',S.f[1],'Player 2',18)+
      H.row(H.btn('Start game','start',undefined,'green',{form:1}))+
      H.note('Each player gets a different random target order. Order of a round: show the order to the audience → hide it → the player calls colours → you place, Check and swap.'));
    if(S.phase==='over')return H.sec('Finished',H.row(H.btn('Rematch','rematch',undefined,'green')+H.btn('Hub','hub',undefined,'ghost')));
    const p=S.p,att=S.att[p],first=lastN()===null,filled=S.slots.filter(Boolean).length;
    let h='';
    /* A. reveal sequence */
    const stageTxt={hidden:'Step 1 of 3 – the audience sees "Get ready". Order is hidden.',shown:'Step 2 of 3 – the order is ON the display now.',play:'Step 3 of 3 – order hidden, play unlocked.'}[S.stage];
    h+=H.sec('Round for '+esc(nm(p))+(S.round>1?' (tiebreaker)':''),H.note(stageTxt)+
      (S.stage==='hidden'?H.row(H.btn('👁 Show order to audience (O)','order',undefined,'gold')):'')+
      (S.stage==='shown'?H.row(H.btn('🙈 Hide order (O) – then play starts','order',undefined,'green')):''));
    /* admin's own view of the target (never sent anywhere) */
    h+=H.sec('Target order (host only) '+H.btn(S.hostHide?'👁 show':'🙈 hide','eye',undefined,'ghost'),
      S.hostHide?H.note('Hidden on this panel.'):'<div class="miniorder">'+S.targets[p].map((id,i)=>'<div style="text-align:center">'+TP.bottleSVG(id)+'<div class="mini">'+(i+1)+'. '+TP.bottleById(id).name+'</div></div>').join('')+'</div>');
    if(S.stage!=='play')return h+H.sec('Attempts',attemptsHTML());
    /* B. placing */
    h+=H.sec('1 · Click the bottles in the order the player calls them'+(first?'':' <span class="mini">(first placement done – now use swaps)</span>'),
      '<div class="pal">'+TP.BOTTLES.map(b=>'<button data-cmd="place" data-arg="'+b.id+'"'+(S.slots.includes(b.id)||!first||S.fin?' disabled':'')+'>'+TP.bottleSVG(b.id)+b.name+'</button>').join('')+'</div>');
    h+=H.sec('2 · Slots'+(first?' (click a placed bottle to remove it)':''),
      '<div class="slots">'+S.slots.map((id,i)=>'<button data-cmd="clear" data-arg="'+i+'" class="'+(id?'filled':'')+'"'+(first?'':' style="cursor:default"')+'>'+(id?TP.bottleSVG(id)+TP.bottleById(id).name:'<span>'+(i+1)+'</span>')+'</button>').join('')+'</div>'+
      H.row(H.btn('✔ Check','check',undefined,'green',{dis:!full()||!dirty()||S.fin||!playing()})+(first?H.btn('Clear all','clearall',undefined,'ghost')+H.btn('↶ Undo bottle','incorrect',undefined,'ghost'):'')+H.btn('↶ Undo last check','undocheck',undefined,'ghost',{dis:!att.length}))+
      (lastN()!==null?H.note('Last check: <b>'+lastN()+' / 6</b> in the correct place'+(stale()?' <i>(greyed on the display – arrangement changed since)</i>':'')+'.'):''));
    /* C. swap bar */
    const swapOK=playing()&&full();
    const pos=S.mode==='pos';
    const btns=pos?[1,2,3,4,5,6].map(i=>'<button class="sw '+(S.sel.includes(String(i))?'picked':'')+'" data-cmd="sel" data-arg="'+i+'"'+(swapOK?'':' disabled')+'>'+i+'</button>').join('')
      :IDS.map(id=>'<button class="sw '+(S.sel.includes(id)?'picked':'')+'" data-cmd="sel" data-arg="'+id+'"'+(swapOK?'':' disabled')+'>'+TP.bottleSVG(id)+LETTER_OF[id]+'</button>').join('');
    h+=H.sec('3 · Swap bottles (does not count as an attempt)',
      H.row(H.btn('By position (1–6)','swapmode','pos',pos?'':'ghost')+H.btn('By colour (B K R G Y W)','swapmode','col',pos?'ghost':''))+
      '<div class="swapbar">'+btns+(S.sel.length===2?H.btn('⇄ Swap','swap',undefined,'gold'):'')+H.btn('↶ Undo swap','undoswap',undefined,'ghost',{dis:!S.swapHist.length})+'</div>'+
      H.note(S.sel.length?'Selected: <b>'+S.sel.map(v=>pos?v:TP.bottleById(v).name).join(' and ')+'</b>'+(S.sel.length===2?' – press Swap or Enter.':'.'):'Pick two '+(pos?'positions':'colours')+', then Swap (or Enter). Keys: '+(pos?'digits 1–6':'B K R G Y W')+', Enter confirms, Esc clears.'));
    if(S.fin)h+=H.sec('Finished!',H.note('<b>'+esc(nm(p))+'</b> completed it in '+att.length+' attempts.')+H.row(H.btn(p===0?'Next player →':'Final result →','continue',undefined,'green')));
    h+=H.sec('Attempts',attemptsHTML());
    return h;
  }
};
function attemptsHTML(){
  return S.names.map((x,i)=>H.row('<b style="min-width:8em">'+esc(x)+'</b> '+(S.att[i].length?S.att[i].join(' → '):'–')+' <span class="mini">('+S.att[i].length+')</span>')).join('');
}
App.register(G);
})();
