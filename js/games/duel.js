/* DUEL ENGINE - shared by Picture Game, Higher or Lower and Finish the Proverb.
   Two players, a 60 second clock each. The active player's clock runs while they guess.
   Correct  -> their clock pauses, the other player's clock starts on a NEW item.
   Skip     -> new item, the clock keeps running.   Incorrect -> buzzer (clock keeps running).
   Whoever's clock reaches 0 loses.  (Reuses the original Flag Duel rules.)
   cfg = { id,name,icon,desc, rules, draw(S), prepare?(item), clue(item,ctx), answer(item),
           setupHost?(S), setupField?(S,n,v), setupCmd?(S,n,a), canStart?(S), incorrectLocks?, lastText?(item), opts()->{} } */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const SECONDS=60;

TP.makeDuel=function(cfg){
  const clocks=[new TP.Clock(SECONDS*1000),new TP.Clock(SECONDS*1000)];
  let S=null,curImg=null,expiredHandled=false;

  const act=()=>clocks[S.turn];
  function resetClocks(){clocks.forEach(c=>{c.pause();c.set(SECONDS*1000);c.lastSec=null;});expiredHandled=false;}
  function fresh(prev){
    resetClocks();
    S={phase:'setup',names:prev?prev.names.slice():[App.memGet(cfg.id+'a',''),App.memGet(cfg.id+'b','')],f:null,
       opts:prev?prev.opts:cfg.opts(),turn:0,started:false,over:false,loser:-1,correct:[0,0],wrong:[0,0],cur:null,shown:false,locked:false,last:'',seen:[]};
    S.f=S.names.slice();
    if(prev){S.phase='ready';S.names=prev.names.slice();}
  }
  function load1(item){
    S.cur=item;S.shown=false;S.locked=false;curImg=null;S.uid=(S.uid||0)+1;
    if(item&&cfg.prepare){
      cfg.prepare(item).then(b=>{if(S&&S.cur===item){curImg=b;App.publish();}}).catch(e=>console.warn('image failed',e));
    }
  }
  const drawNext=()=>load1(cfg.draw(S));
  function finish(){
    clocks.forEach(c=>c.pause());S.over=true;S.loser=S.turn;S.phase='over';
    App.sfx('end');App.sfx('win');App.confetti(6000);
  }
  const isLive=()=>S.phase==='play'&&S.started&&!S.over&&clocks[S.turn].run;

  const G={
    id:cfg.id,name:cfg.name,icon:cfg.icon,desc:cfg.desc,
    open(){fresh(null);if(cfg.onOpen)cfg.onOpen(S);},
    /* used by the Team Tournament: preset the two players (and options) and wait for Start */
    preset(names,opts){fresh(null);S.names=names.slice();S.f=names.slice();if(opts)S.opts=JSON.parse(JSON.stringify(opts));S.phase='ready';},
    result(){return S&&S.phase==='over'?{w:1-S.loser}:null;},
    active:()=>S&&(S.phase==='play'),
    resumable:s=>s&&s.phase==='play',
    pause(){clocks.forEach(c=>c.pause());},
    field(n,v){
      if(n==='n1')S.f[0]=v;else if(n==='n2')S.f[1]=v;
      else if(cfg.setupField)cfg.setupField(S,n,v);
    },
    save(){return{S,ms:clocks.map(c=>c.left())};},
    load(o){
      S=o.S;clocks.forEach((c,i)=>{c.pause();c.set(o.ms[i]);});expiredHandled=false;
      const it=S.cur;S.cur=null;if(it)load1(it);S.cur=it;
    },

    cmd(name,arg){
      if(S.phase==='setup'||S.phase==='ready'){
        if(S.phase==='setup'&&cfg.setupCmd&&cfg.setupCmd(S,name,arg)!==false)return;
        if(name==='start'||name==='toggle'){
          if(S.phase==='setup'){
            const err=cfg.canStart?cfg.canStart(S):null;if(err){App.toast(err);return;}
            const a=(S.f[0]||'').trim()||'Player 1';let b=(S.f[1]||'').trim()||'Player 2';
            if(b.toLowerCase()===a.toLowerCase())b+=' (2)';
            App.memSet(cfg.id+'a',(S.f[0]||'').trim());App.memSet(cfg.id+'b',(S.f[1]||'').trim());
            S.names=[a,b];
          }
          S.phase='play';S.started=true;S.turn=0;drawNext();act().start();App.sfx('tick');
        }
        return;
      }
      if(S.phase==='over'){
        if(name==='rematch'||name==='toggle'){fresh(S);S.phase='play';S.started=true;drawNext();act().start();App.sfx('tick');return;}
        if(name==='adjc'){const [i,d]=arg.split(':');S.correct[+i]=Math.max(0,S.correct[+i]+ +d);return;}
        return false;
      }
      // ---- play ----
      switch(name){
        case'toggle':
          if(act().run)act().pause();else if(act().left()>0)act().start();
          break;
        case'correct':
          if(!isLive()||S.locked)return false;
          App.sfx('ok');S.correct[S.turn]++;S.last=cfg.lastText?cfg.lastText(S.cur,true):'';
          act().pause();S.turn=1-S.turn;drawNext();act().start();break;
        case'skip':case'next':
          if(!S.started||S.over||!act().run)return false;
          App.sfx('tick');S.last='';drawNext();break;
        case'incorrect':
          if(!isLive()||S.locked)return false;
          App.sfx('buzz');S.wrong[S.turn]++;
          if(cfg.incorrectLocks){S.shown=true;S.locked=true;S.last=cfg.lastText?cfg.lastText(S.cur,false):'';}
          break;
        case'reveal':if(!S.cur)return false;S.shown=true;App.sfx('pop');break;
        case'adjt':{const [i,d]=arg.split(':');clocks[+i].add(+d*1000);break;}
        case'adjc':{const [i,d]=arg.split(':');S.correct[+i]=Math.max(0,S.correct[+i]+ +d);break;}
        case'rematch':fresh(S);S.phase='play';S.started=true;drawNext();act().start();break;
        case'quit':App.go('hub');return false;
        default:return false;
      }
    },
    tick(){
      if(!S||S.phase!=='play')return false;
      App.beep(act(),5);
      if(act().run&&act().done()&&!expiredHandled){expiredHandled=true;finish();return true;}
      return false;
    },

    view(){
      const title=cfg.icon+' '+cfg.name;
      if(S.phase==='setup'||S.phase==='ready'){
        return{kind:'scene',top:{title},blocks:[{t:'text',cls:'info',br:1,x:'Each player gets a 60 second clock.\nYour clock runs while you guess. Get it right and your clock pauses — your opponent\'s starts.\nSkip for a new item (your clock keeps running). First clock to hit 0 loses!'},
          {t:'lbl',x:S.phase==='setup'?'The host is choosing players…':'Get ready: '+S.names[0]+' vs '+S.names[1]}],
          btns:S.phase==='ready'?[{cmd:'start',label:'▶ Start',cls:'green',key:'Space'}]:[]};
      }
      const turn=S.turn,over=S.over;
      let blocks=[];
      if(S.cur){const c=cfg.clue(S.cur,{img:curImg,shown:S.shown,S});blocks=c;}
      if(S.last)blocks.push({t:'text',cls:'lastres',x:S.last});
      const paused=S.started&&!over&&!act().run;
      const btns=[];
      if(!over){
        if(act().run)btns.push({cmd:'correct',label:'✔ Correct',cls:'green',key:'C',dis:S.locked},{cmd:'skip',label:'⏭ Skip',cls:'sky',key:'S'},{cmd:'incorrect',label:'✖ Incorrect',cls:'',key:'X',dis:S.locked});
        else if(act().left()>0)btns.push({cmd:'toggle',label:'▶ Resume',cls:'green',key:'Space'});
      }
      const v={kind:'scene',top:{title,clock:act().view({low:10}),text:over?'Game over':'▶ '+S.names[turn]+"'s turn"},blocks,btns,paused,
        board:S.names.map((n,i)=>({name:n,sub:'✔ '+S.correct[i]+' correct',clock:clocks[i].view({low:10}),score:Math.ceil(clocks[i].left()/1000),unit:'s',n:Math.ceil(clocks[i].left()/1000),active:!over&&turn===i})),
        snapSub:over?'Game over':'Time remaining'};
      if(over){
        const w=1-S.loser;
        v.modal={icon:'🏁',title:cfg.name+' Over',winner:S.names[w]+' Wins!',
          lines:[S.names[S.loser]+' ran out of time',S.names[0]+' '+Math.ceil(clocks[0].left()/1000)+'s left ('+S.correct[0]+' correct) — '+S.names[1]+' '+Math.ceil(clocks[1].left()/1000)+'s left ('+S.correct[1]+' correct)'],
          btns:[{cmd:'rematch',label:'Rematch',cls:'green',key:'Space'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
      }
      return v;
    },

    host(){
      if(S.phase==='setup'){
        return H.sec('Players',H.field('Player 1 name','n1',S.f[0],'Player 1',18)+H.field('Player 2 name','n2',S.f[1],'Player 2',18))+
          (cfg.setupHost?cfg.setupHost(S):'')+
          H.sec('Start',H.row(H.btn('Start duel','start',undefined,'green',{form:1}))+H.note(esc(cfg.rules||'')));
      }
      if(S.phase==='ready')return H.sec('Ready: '+esc(S.names[0])+' vs '+esc(S.names[1]),H.note('Clocks are reset.')+H.row(H.btn('▶ Start','start',undefined,'green')));
      let h='';
      if(S.cur){const a=cfg.answer(S.cur);h+=H.sec('Current item – ANSWER (host only)',H.ans(a.label||'Answer',a.val,a.sub)+(S.shown?H.note('✔ Answer is currently shown on the display.'):''));}
      if(S.phase==='over'){
        return h+H.sec('Game over',H.note('<b>'+esc(S.names[1-S.loser])+'</b> wins.')+H.row(H.btn('Rematch','rematch',undefined,'green')+H.btn('Hub','hub',undefined,'ghost')))+adjust();
      }
      const run=act().run;
      h+=H.sec('Controls – '+esc(S.names[S.turn])+"'s turn",
        H.row(H.btn(run?'⏸ Pause':'▶ Resume','toggle',undefined,run?'sky':'green')+H.btn('✔ Correct','correct',undefined,'green',{dis:S.locked||!run})+H.btn('⏭ Skip','skip',undefined,'sky',{dis:!run})+H.btn('✖ Incorrect','incorrect',undefined,'',{dis:S.locked||!run})+H.btn('👁 Reveal','reveal',undefined,'gold')+H.btn('Next item','next',undefined,'ghost',{dis:!run}))+
        H.note('Keys: Space pause · C correct · S skip · X incorrect · N next. '+(cfg.incorrectLocks?'Incorrect reveals the answer; press Skip/Next to continue.':'Incorrect keeps the clock running – the player can try again.')));
      h+=adjust();
      h+=H.sec('Game',H.row(H.btn('Restart (new match)','rematch',undefined,'ghost')+H.btn('Quit to hub','quit',undefined,'ghost')));
      return h;
    }
  };
  function adjust(){
    return H.sec('Timer / score adjust',S.names.map((n,i)=>H.row('<b style="min-width:7em">'+esc(n)+'</b>'+
      H.btn('−5s','adjt',i+':-5','ghost')+H.btn('−1s','adjt',i+':-1','ghost')+H.btn('+1s','adjt',i+':1','ghost')+H.btn('+5s','adjt',i+':5','ghost')+
      ' &nbsp;✔ '+S.correct[i]+' '+H.btn('−1','adjc',i+':-1','ghost')+H.btn('+1','adjc',i+':1','ghost'))).join(''));
  }
  return G;
};
})();
