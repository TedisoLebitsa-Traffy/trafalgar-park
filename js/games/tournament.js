/* TEAM TOURNAMENT - 2 teams x 4 players, 4 chosen games. QUICK format: game k is one match, member k v member k. BIG format: each game = 4 head-to-heads (member 1 v 1, 2 v 2, 3 v 3, 4 v 4) played with the
   normal engine of that game (Bottle Blind, Higher or Lower, Finish the Proverb, Speed Maths, Picture Game). The team that wins more of the 4 matches
   wins the game (2-2 -> one sudden-death match between a random pair). The team that wins more games wins the tournament
   (2-2 -> the host picks a decider game). This module is a "game" that wraps the real game engines (`sub`). */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const POOL=['bottle','higherlower','proverb','speedmaths','picture'];
const DEFAULT=['bottle','higherlower','proverb','speedmaths'];
let T=null,sub=null;
/* formats: 'quick' = one match per game (player k plays game k) | 'big' = 4 head-to-heads per game */
const quick=()=>T.format==='quick';
const mkPairs=g=>quick()?[(g<4?[g,g]:(k=>[k,k])(TP.secureInt(4)))]:[[0,0],[1,1],[2,2],[3,3]];
const mlabel=()=>quick()?'':(T.mi>=4?' · Sudden-death match':' · Match '+(T.mi+1)+' of 4');

const gname=id=>App.games[id].name,gicon=id=>App.games[id].icon;
const tn=i=>T.teams[i].name;
function fresh(prev){
  T={phase:'setup',
     f:prev?prev.f:{t0:App.memGet('tnA',''),t1:App.memGet('tnB',''),p:App.memGet('tnP',['','','','','','','','']),g:App.memGet('tnG',DEFAULT.slice()),fmt:App.memGet('tnF','quick')},
     teams:null,format:'quick',games:[],pic:prev?prev.pic:{mixed:true,cats:[]},gi:0,mi:0,res:[[],[],[],[]],pairs:[],gw:[0,0],gdone:[null,null,null,null],done:false,champ:null};
  sub=null;
}
const curPair=()=>T.pairs[T.gi][T.mi];
const matchNames=()=>{const [a,b]=curPair();return[T.teams[0].players[a],T.teams[1].players[b]];};
const baseMatches=()=>T.pairs[T.gi].length;
function startMatch(){
  const id=T.games[T.gi];sub=App.games[id];sub.open();
  sub.preset(matchNames(),id==='picture'?T.pic:null);
  T.phase='match';T.done=false;App.sfx('ok');
}
function record(){
  if(T.phase!=='match'||T.done||!sub)return false;
  const r=sub.result();if(r===null)return false;
  T.done=true;T.res[T.gi][T.mi]=r.w;return true;
}
function finishGame(w){
  T.gdone[T.gi]=w;T.gw[w]++;
  const last=T.gi>=T.games.length-1;
  if(!last){T.gi++;T.mi=0;T.phase='between';return;}
  if(T.games.length===4&&T.gw[0]===T.gw[1]){T.phase='decider';return;}
  champion();
}
function champion(){T.champ=T.gw[0]>T.gw[1]?0:1;T.phase='final';App.sfx('win');App.confetti(8000);}
function afterMatch(){
  sub=null;
  const r=T.res[T.gi];
  if(quick()){finishGame(r[0]);return;}
  if(T.mi<3){T.mi++;T.phase='between';return;}
  if(T.mi===3){
    const a=r.filter(x=>x===0).length,b=r.filter(x=>x===1).length;
    if(a!==b){finishGame(a>b?0:1);return;}
    T.pairs[T.gi].push([TP.secureInt(4),TP.secureInt(4)]);T.mi=4;T.phase='between';
    App.toast('🤝 2–2! Sudden-death match to decide the game');return;
  }
  finishGame(r[4]);     // sudden death decided it
}
function gameScore(g){const r=T.res[g]||[];return[r.filter(x=>x===0).length,r.filter(x=>x===1).length];}

const G={
  id:'tournament',name:'Team Tournament',icon:'🏆',desc:'2 teams · 4 games',hidden:true,
  open(){fresh(null);},
  active:()=>T&&(T.phase==='match'?true:T.phase!=='setup'&&T.phase!=='final'),
  resumable:s=>s&&s.phase!=='setup'&&s.phase!=='final',
  pause(){if(sub&&sub.pause)sub.pause();},
  field(n,v){
    if(!T||T.phase!=='setup')return;
    if(n==='t0')T.f.t0=v;else if(n==='t1')T.f.t1=v;
    else if(/^p\d$/.test(n))T.f.p[+n[1]]=v;
    else if(/^g\d$/.test(n))T.f.g[+n[1]]=v;
    else if(n==='fmt')T.f.fmt=v;
  },
  save(){return{S:T,sub:sub?{id:sub.id,state:sub.save()}:null};},
  load(o){T=o.S;sub=null;if(o.sub){sub=App.games[o.sub.id];sub.load(o.sub.state);}},
  back(){return sub&&sub.back?sub.back():false;},
  /* one level up: match -> overview, overview/setup/final -> mode screen */
  exit(){
    if(T.phase==='match'){sub=null;T.phase='between';return true;}
    App.go('mode');return true;
  },
  /* commands that would leave the tournament are redirected one level up */
  pre(name){
    if(name==='hub')return G.exit();
    return undefined;
  },

  cmd(name,arg){
    switch(T.phase){
    case'setup':{
      if(name==='tcat'){
        if(arg==='mixed'){T.pic.mixed=true;T.pic.cats=[];}
        else{T.pic.mixed=false;const i=T.pic.cats.indexOf(arg);if(i>=0)T.pic.cats.splice(i,1);else T.pic.cats.push(arg);if(!T.pic.cats.length)T.pic.mixed=true;}
        return;
      }
      if(name==='start'||name==='toggle'){
        const gs=T.f.g.slice(0,4).map(g=>POOL.includes(g)?g:'bottle');
        let a=(T.f.t0||'').trim()||'Team A',b=(T.f.t1||'').trim()||'Team B';
        if(a.toLowerCase()===b.toLowerCase())b+=' (2)';
        const pl=(ti,nm)=>[0,1,2,3].map(i=>{const v=((T.f.p[ti*4+i])||'').trim();return v||(nm+' '+(i+1));});
        T.teams=[{name:a,players:pl(0,a)},{name:b,players:pl(1,b)}];
        T.format=T.f.fmt==='big'?'big':'quick';T.games=gs;T.pairs=gs.map((g,i)=>mkPairs(i));T.gi=0;T.mi=0;T.phase='between';App.memSet('tnF',T.format);
        App.memSet('tnA',(T.f.t0||'').trim());App.memSet('tnB',(T.f.t1||'').trim());App.memSet('tnP',T.f.p);App.memSet('tnG',gs);
        App.sfx('ok');
      }
      return;}
    case'between':
      if(name==='tstart'||name==='toggle'||name==='next'||name==='start'){startMatch();return;}
      return false;
    case'decider':
      if(name==='tdecide'&&POOL.includes(arg)){
        T.games.push(arg);T.pairs.push(mkPairs(4));T.res.push([]);T.gdone.push(null);T.gi=4;T.mi=0;T.phase='between';
        App.toast('Decider game: '+gname(arg));return;
      }
      return false;
    case'final':
      if(name==='tagain'||name==='toggle'){const keep=T;fresh(null);T.f=keep.f;T.pic=keep.pic;return;}
      if(name==='trematch'){
        const keep=T;T.phase='between';T.games=keep.games.slice(0,4);T.pairs=T.games.map((g,i)=>mkPairs(i));T.res=[[],[],[],[]];T.gdone=[null,null,null,null];T.gw=[0,0];T.gi=0;T.mi=0;T.champ=null;return;}
      return false;
    }
    // ---- a match is in progress ----
    const over=sub.result()!==null;
    if(over){
      if(name==='tcontinue'||name==='toggle'||name==='next'){record();afterMatch();return;}
      return false;                                   // nothing else is allowed on a finished match
    }
    if(name==='tabandon'){sub=null;T.phase='between';return;}
    const r=sub.cmd(name,arg);
    record();
    return r;
  },
  tick(){
    if(!T||T.phase!=='match'||!sub)return false;
    let ch=sub.tick?sub.tick():false;
    if(record())ch=true;
    return ch;
  },

  view(){
    const top={title:'🏆 Team Tournament'};
    if(T.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'info',br:1,x:'2 teams of 4 players · 4 games\nEach player meets their opposite number.\nWin your match, win the game —\nthe team that wins more games wins the tournament!'},{t:'lbl',x:'The host is setting up the teams…'}]};
    if(T.phase==='match'){
      const v=sub.view();
      const gl=T.teams.map(t=>t.name);
      v.foot=gl[0]+' vs '+gl[1]+' · Game '+(T.gi+1)+' of '+T.games.length+' · '+(quick()?'Player '+(curPair()[0]+1)+' v Player '+(curPair()[1]+1):(T.mi>=4?'Sudden-death match':'Match '+(T.mi+1)+' of 4'))+'   (games: '+T.gw[0]+' – '+T.gw[1]+')';
      if(v.board)v.board.forEach((e,i)=>{e.sub=gl[i]+(e.sub?' · '+e.sub:'');});
      if(v.modal&&sub.result()!==null){
        const w=sub.result().w;
        v.modal.btns=[{cmd:'tcontinue',label:'Continue →',cls:'green',key:'Space'}];
        v.modal.lines=(v.modal.lines||[]).concat(['Point for '+gl[w]+'!']);
      }
      return v;
    }
    const games=T.games.map((id,g)=>{
      const sc=gameScore(g);
      const matches=T.pairs[g].map((p,k)=>({a:T.teams[0].players[p[0]],b:T.teams[1].players[p[1]],w:T.res[g][k]===undefined?null:T.res[g][k],now:g===T.gi&&k===T.mi&&T.phase==='between'}));
      return{n:g<4?g+1:'★',name:gname(id),icon:gicon(id),state:T.gdone[g]!==null?'done':(g===T.gi?'now':'next'),score:T.res[g].length?sc:null,matches};
    });
    const board=T.teams.map((t,i)=>({name:t.name,sub:'games won',score:T.gw[i],unit:'',n:T.gw[i],active:false}));
    const v={kind:'scene',top:Object.assign({},top,{text:T.phase==='final'?'Final result':(T.phase==='decider'?'Decider needed':'Game '+(T.gi+1)+' of '+T.games.length)}),
      blocks:[{t:'tour',games}],board,snapSub:'Games won'};
    if(T.phase==='between'){
      const nm=matchNames();
      v.blocks.push({t:'text',cls:'info',x:'Next: '+gicon(T.games[T.gi])+' '+gname(T.games[T.gi])+' – '+nm[0]+' vs '+nm[1]+(!quick()&&T.mi>=4?'  (sudden death)':'')});
      v.btns=[{cmd:'tstart',label:'▶ Start match',cls:'green',key:'Space'}];
    }
    if(T.phase==='decider')v.blocks.push({t:'text',cls:'banner',style:'font-size:2.6em',x:'2 – 2! A decider game will settle it'});
    if(T.phase==='final'){
      v.modal={icon:'🏆',title:'Team Tournament Champions',winner:tn(T.champ)+' win!',lines:[tn(0)+' '+T.gw[0]+' – '+T.gw[1]+' '+tn(1)+' in games'],
        btns:[{cmd:'trematch',label:'Rematch (same teams)',cls:'green'},{cmd:'tagain',label:'New tournament',cls:''},{cmd:'hub',label:'Back',cls:'ghost'}]};
    }
    return v;
  },

  host(){
    if(T.phase==='setup'){
      const opt=(cur)=>POOL.map(g=>'<option value="'+g+'"'+(cur===g?' selected':'')+'>'+gicon(g)+' '+esc(gname(g))+'</option>').join('');
      const cats=TP.pictureCats();
      const usesPic=T.f.g.slice(0,4).includes('picture');
      let h=H.sec('Format','<label class="fld"><span>Tournament format</span><select class="sel" name="fmt"><option value="quick"'+(T.f.fmt!=='big'?' selected':'')+'>Quick – 4 matches in total: player 1 plays game 1, player 2 plays game 2, player 3 game 3, player 4 game 4</option><option value="big"'+(T.f.fmt==='big'?' selected':'')+'>Big – 16 matches: every pair meets in every game (best of 4 per game)</option></select></label>');
      h+=H.sec('Teams',
        '<div class="hgrid2"><div>'+H.field('Team A name','t0',T.f.t0,'Team A',18)+[0,1,2,3].map(i=>H.field('A'+(i+1),'p'+i,T.f.p[i],'Player A'+(i+1),16)).join('')+'</div>'+
        '<div>'+H.field('Team B name','t1',T.f.t1,'Team B',18)+[0,1,2,3].map(i=>H.field('B'+(i+1),'p'+(i+4),T.f.p[i+4],'Player B'+(i+1),16)).join('')+'</div></div>'+
        H.note('Quick: A1 v B1 plays game 1, A2 v B2 game 2, A3 v B3 game 3, A4 v B4 game 4 (decider: a random pair). Big: 1 v 1, 2 v 2, 3 v 3, 4 v 4 in every game.'));
      h+=H.sec('Choose the 4 games',[0,1,2,3].map(i=>'<label class="fld"><span>Game '+(i+1)+'</span><select class="sel" name="g'+i+'">'+opt(T.f.g[i])+'</select></label>').join('')+
        H.note('The same game can be picked more than once. In Quick format the order matters: game 1 is played by player 1 of each team, game 2 by player 2, and so on.'));
      h+=H.sec('Picture Game categories (only used if Picture Game is one of the games)',
        '<div class="chipsel"><button class="chip '+(T.pic.mixed?'sel':'')+'" data-cmd="tcat" data-arg="mixed">Random category per match</button>'+cats.map(c=>'<button class="chip '+((!T.pic.mixed&&T.pic.cats.includes(c.id))?'sel':'')+'" data-cmd="tcat" data-arg="'+esc(c.id)+'"'+(c.count()>0?'':' disabled')+'>'+esc(c.name)+'</button>').join('')+'</div>');
      return h+H.sec('Go',H.row(H.btn('Start tournament','start',undefined,'green',{form:1})));
    }
    let h='';
    if(T.phase==='match'){
      const over=sub.result()!==null;
      h+=H.sec('Tournament – '+esc(tn(0))+' vs '+esc(tn(1)),H.note('Game '+(T.gi+1)+' of '+T.games.length+(quick()?'':' · '+(T.mi>=4?'sudden death':'match '+(T.mi+1)+' of 4'))+' · games won '+T.gw[0]+' – '+T.gw[1])+
        (over?H.row(H.btn('Continue →','tcontinue',undefined,'green')):H.row(H.btn('Abandon match (back to overview)','tabandon',undefined,'ghost'))));
      return h+sub.host();
    }
    if(T.phase==='between'){
      const nm=matchNames();
      h+=H.sec('Next match',H.note('<b>'+gicon(T.games[T.gi])+' '+esc(gname(T.games[T.gi]))+'</b> – game '+(T.gi+1)+' of '+T.games.length+(quick()?'':(T.mi>=4?' (sudden death)':' · match '+(T.mi+1)+' of 4')))+
        H.ans('Up next',nm[0]+'  vs  '+nm[1],tn(0)+' v '+tn(1))+H.row(H.btn('▶ Start match','tstart',undefined,'green')));
    }
    if(T.phase==='decider'){
      h+=H.sec('2 – 2 after four games: pick a decider game',H.row(POOL.map(g=>H.btn(gicon(g)+' '+esc(gname(g)),'tdecide',g,'gold')).join('')));
    }
    if(T.phase==='final')h+=H.sec('Finished',H.note('<b>'+esc(tn(T.champ))+'</b> win the tournament '+T.gw[0]+' – '+T.gw[1]+'.')+H.row(H.btn('Rematch (same teams)','trematch',undefined,'green')+H.btn('New tournament','tagain')+H.btn('Back','hub',undefined,'ghost')));
    h+=H.sec('Scores',T.games.map((id,g)=>{const s=gameScore(g);return H.row('<b style="min-width:11em">'+gicon(id)+' '+esc(gname(id))+'</b> matches '+s[0]+' – '+s[1]+(T.gdone[g]!==null?' → <b>'+esc(tn(T.gdone[g]))+'</b>':''));}).join(''));
    return h;
  }
};
App.register(G);
})();
