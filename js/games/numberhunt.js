/* NUMBER HUNT - two players, a 4x4 grid (A-D x 1-4) of face-down cells hiding the numbers 1-16 in a secret random order.
   The order lives ONLY in this file's memory (GRID). It is never rendered (display or admin), never logged, and never shown
   to the host: a number goes on screen only for the 1-second reveal of a tapped cell. Autosave keeps it scrambled (not readable).
   Each player hunts 1, 2, 3 ... in order; a wrong cell resets their progress to 0 and passes the turn. First to find 16 in a row wins. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const REVEAL_MS=1000;
let S=null,GRID=null;   // GRID: array of 16 numbers, index = row*4+col. Memory only.

/* scrambled (not human-readable) form for autosave */
const KEY=[0x5b,0xa7,0x13,0xe9,0x2d,0x71,0xc4,0x8f];
const enc=a=>btoa(a.map((v,i)=>String.fromCharCode(((v+37)^KEY[i%8])&255)).join(''));
const dec=s=>Array.from(atob(s)).map((c,i)=>((c.charCodeAt(0)^KEY[i%8])&255)-37);
const cellName=i=>'ABCD'[i%4]+(Math.floor(i/4)+1);
const parse=a=>{
  if(typeof a==='number')return a;
  const m=/^([A-D])([1-4])$/i.exec(String(a).trim());
  if(m)return(m[2]-1)*4+'ABCD'.indexOf(m[1].toUpperCase());
  const n=+a;return Number.isInteger(n)&&n>=0&&n<16?n:-1;
};
function shuffleGrid(){GRID=TP.secureShuffle([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);S.g=enc(GRID);}

function openState(prev){
  S={phase:prev?'wheel':'setup',names:prev?prev.names.slice():['',''],f:prev?prev.names.slice():[App.memGet('nhA',''),App.memGet('nhB','')],
     prog:[0,0],turn:0,rev:null,winPending:null,wheel:null,hist:[],col:null,paused:false,g:null,starter:null,winner:null};
  GRID=null;
  if(prev){shuffleGrid();}
}
const need=p=>S.prog[p]+1;
/* ends an expired 1-second reveal (also called before every tap, so timer throttling can never swallow a tap) */
function settle(){
  if(S.phase==='play'&&S.rev&&Date.now()>=S.rev.until){
    S.rev=null;
    if(S.winPending!==null){S.phase='over';S.winner=S.winPending;S.winPending=null;App.sfx('win');App.confetti(7000);}
    return true;
  }
  return false;
}

const G={
  id:'numberhunt',name:'Number Hunt',icon:'🔢',desc:'Find 1 to 16 in order',
  open(){openState(null);},
  active:()=>S&&(S.phase==='play'||S.phase==='wheel'),
  resumable:s=>s&&(s.phase==='play'||s.phase==='wheel'),
  pause(){if(S.phase==='play')S.paused=true;},
  field(n,v){if(n==='n1')S.f[0]=v;if(n==='n2')S.f[1]=v;},
  save(){return{S};},
  load(o){
    S=o.S;S.rev=null;S.col=null;
    GRID=S.g?dec(S.g):null;
    if(S.wheel)TP.wheel.resume(S.wheel);
    if(S.winPending!==null&&S.winPending!==undefined){S.phase='over';S.winner=S.winPending;S.winPending=null;}
  },

  cmd(name,arg){
    switch(S.phase){
    case'setup':
      if(name==='start'||name==='toggle'){
        const a=(S.f[0]||'').trim()||'Player 1';let b=(S.f[1]||'').trim()||'Player 2';
        if(b.toLowerCase()===a.toLowerCase())b+=' (2)';
        App.memSet('nhA',(S.f[0]||'').trim());App.memSet('nhB',(S.f[1]||'').trim());
        S.names=[a,b];shuffleGrid();S.phase='wheel';App.sfx('ok');
      }
      return;
    case'wheel':
      if((name==='spin'||name==='toggle')&&!S.wheel){S.wheel=TP.wheel.spin(2);return;}
      if((name==='continue'||name==='next'||name==='toggle')&&S.wheel&&S.wheel.fin){S.turn=S.wheel.winner;S.starter=S.wheel.winner;S.phase='play';App.sfx('ok');return;}
      if(name==='respin'&&S.wheel&&S.wheel.fin){S.wheel=TP.wheel.spin(2);return;}
      return false;
    case'over':
      if(name==='rematch'||name==='toggle'){openState(S);return;}
      if(name==='adj'){const [i,d]=arg.split(':');S.prog[+i]=Math.max(0,Math.min(16,S.prog[+i]+ +d));return;}
      return false;
    }
    // ---- play ----
    settle();
    if(S.phase==='over')return;
    if(name==='spin')return false;
    if(name==='toggle'){S.paused=!S.paused;return;}
    if(name==='undo'){
      const h=S.hist.pop();if(!h)return false;
      S.prog=h.prog;S.turn=h.turn;S.rev=null;S.winPending=null;S.col=null;return;
    }
    if(name==='adj'){const [i,d]=arg.split(':');S.prog[+i]=Math.max(0,Math.min(15,S.prog[+i]+ +d));return;}
    if(name==='restart'){openState(S);return;}
    // keyboard: column letter then row number ('C' arrives as the generic "correct" key)
    if(name==='col:A'||name==='col:B'||name==='col:D'||name==='correct'){S.col=name==='correct'?'C':name[4];return;}
    if(/^row:[1-4]$/.test(name)){if(!S.col)return false;const c=S.col;S.col=null;return G.cmd('call',c+name[4]);}
    if(name!=='call')return false;
    const i=parse(arg);
    if(i<0||S.paused||S.rev)return false;                       // taps are ignored during the 1 s reveal and while paused
    S.hist.push({prog:S.prog.slice(),turn:S.turn});if(S.hist.length>60)S.hist.shift();
    const num=GRID[i],p=S.turn;
    S.col=null;
    if(num===need(p)){
      S.prog[p]++;App.sfx('tick');App.sfx('ok');
      S.rev={i,st:'ok',until:Date.now()+REVEAL_MS};
      if(S.prog[p]===16)S.winPending=p;
    }else{
      S.prog[p]=0;S.turn=1-p;App.sfx('buzz');
      S.rev={i,st:'bad',until:Date.now()+REVEAL_MS};
    }
  },
  tick(){
    if(!S)return false;
    if(S.phase==='wheel')return TP.wheel.tick(S.wheel);
    return settle();
  },

  view(){
    const top={title:'🔢 Number Hunt'};
    if(S.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'info',br:1,x:'A 4×4 grid hides the numbers 1 to 16 face-down.\nFind them IN ORDER: 1, then 2, then 3 …\nPick a wrong cell and your progress resets to 0 and the turn passes!\nFirst to find all 16 in a row wins.'},{t:'lbl',x:'The host is choosing players…'}]};
    const board=S.names.map((n,i)=>({name:n,sub:'found '+S.prog[i]+' of 16',score:S.prog[i],unit:' / 16',n:S.prog[i],active:(S.phase==='play'||S.phase==='over')&&S.turn===i&&S.phase!=='over'}));
    if(S.phase==='wheel'){
      const w=S.wheel,blocks=[TP.wheel.block(w,S.names)];
      if(w&&w.fin)blocks.push({t:'text',cls:'banner',x:S.names[w.winner]+' starts!'});
      else blocks.push({t:'text',cls:'info',x:w?'Spinning…':'Spin the wheel to see who starts!'});
      return{kind:'scene',top:Object.assign({},top,{text:'Who starts?'}),blocks,board,
        btns:!w?[{cmd:'spin',label:'🎡 Spin the wheel',cls:'green',key:'W'}]:(w.fin?[{cmd:'continue',label:'Start hunting →',cls:'green',key:'Space'}]:[]),snapSub:'Found so far'};
    }
    const cells=Array.from({length:16},(_,i)=>({face:S.rev&&S.rev.i===i?GRID[i]:null,st:S.rev&&S.rev.i===i?S.rev.st:null}));
    const p=S.turn,over=S.phase==='over';
    const v={kind:'scene',top:Object.assign({},top,{left:over?undefined:{k:'Hunting',v:S.names[p]+' · looking for '+need(p)},text:over?'Game over':'▶ '+S.names[p]+"'s turn"}),
      blocks:[{t:'nhgrid',cells},{t:'lbl',x:'Say a cell, e.g. “D2” — a wrong cell resets your count to 0'}],board,paused:S.paused&&!over,snapSub:'Found so far'};
    if(over)v.modal={icon:'🏆',title:'Number Hunt Over',winner:S.names[S.winner]+' Wins!',lines:S.names.map((n,i)=>n+': found '+S.prog[i]+' of 16'),
      btns:[{cmd:'rematch',label:'Rematch',cls:'green',key:'Space'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
    return v;
  },

  host(){
    if(S.phase==='setup')return H.sec('Players',H.field('Player 1 name','n1',S.f[0],'Player 1',18)+H.field('Player 2 name','n2',S.f[1],'Player 2',18)+
      H.row(H.btn('Start game','start',undefined,'green',{form:1}))+
      H.note('The numbers are shuffled in memory only – even you will not know where any number is. A number appears only when a cell is flipped.'));
    if(S.phase==='wheel'){
      const w=S.wheel;
      return H.sec('Who starts?',(!w?H.row(H.btn('🎡 Spin the wheel (W)','spin',undefined,'green')):(w.fin?H.note('<b>'+esc(S.names[w.winner])+'</b> starts!')+H.row(H.btn('Start hunting →','continue',undefined,'green')+H.btn('Spin again','respin',undefined,'ghost')):H.note('Spinning…'))));
    }
    const over=S.phase==='over';
    let h='';
    if(!over){
      h+=H.sec('Call a cell – '+esc(S.names[S.turn])+' is looking for '+need(S.turn),
        '<div class="nhg"><div></div>'+['A','B','C','D'].map(c=>'<div class="hd">'+c+'</div>').join('')+
        [0,1,2,3].map(r=>'<div class="hd">'+(r+1)+'</div>'+[0,1,2,3].map(c=>'<button data-cmd="call" data-arg="'+(r*4+c)+'">'+'ABCD'[c]+(r+1)+'</button>').join('')).join('')+'</div>'+
        H.note('Or type a column letter then a row number (e.g. <b>D</b> then <b>2</b>).'+(S.col?' Column <b>'+S.col+'</b> chosen – now press a row number.':'')+' Taps are ignored for 1 s while a cell is showing.'));
      h+=H.sec('Controls',H.row(H.btn(S.paused?'▶ Resume':'⏸ Pause','toggle',undefined,S.paused?'green':'sky')+H.btn('↶ Undo last tap','undo',undefined,'ghost',{dis:!S.hist.length})+H.btn('Restart (new shuffle + wheel)','restart',undefined,'ghost')));
    }else h+=H.sec('Finished',H.note('<b>'+esc(S.names[S.winner])+'</b> found all 16.')+H.row(H.btn('Rematch','rematch',undefined,'green')+H.btn('Hub','hub',undefined,'ghost')));
    h+=H.sec('Progress adjust (fix mistakes)',S.names.map((n,i)=>H.row('<b style="min-width:8em">'+esc(n)+'</b> found '+S.prog[i]+' of 16 '+H.btn('−1','adj',i+':-1','ghost')+H.btn('+1','adj',i+':1','ghost'))).join(''));
    return h;
  }
};
App.register(G);
})();
