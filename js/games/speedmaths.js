/* SPEED MATHS - two players play ONE AFTER THE OTHER, 60 s each, with DIFFERENT randomly generated sums.
   Sum types: tally-mark addition (groups of five) and Roman numerals (answer as a number OR a Roman numeral).
   Wrong answer = -1 second. Every 5 correct in a row = +2 bonus points. Highest score wins; a tie goes to a 30 s sudden-death round. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const clock=new TP.Clock(60000);
let S=null,img=null,expiredHandled=false;
const MAIN=60000,SD=30000;

function openState(prev){
  clock.pause();clock.set(MAIN);expiredHandled=false;img=null;
  S={phase:'setup',names:prev?prev.names.slice():['',''],f:prev?prev.names.slice():[App.memGet('smA',''),App.memGet('smB','')],
     round:'main',p:0,score:[0,0],bonus:[0,0],correct:[0,0],wrong:[0,0],streak:0,cur:null,seen:[],uid:0,sd:[0,0],sdRounds:0,over:false,result:null};
  if(prev){S.phase='ready';}
}
function newSum(){
  let it,tries=0;
  do{it=TP.mathgen.speed();tries++;}while(S.seen.includes(it.k)&&tries<80);
  S.seen.push(it.k);S.cur=it;S.uid++;
  img=TP.svgBlob(TP.mathgen.speedSVG(it));
}
const pts=()=>S.round==='main'?S.score:S.sd;
function beginTurn(){
  clock.pause();clock.set(S.round==='main'?MAIN:SD);expiredHandled=false;S.streak=0;newSum();clock.start();S.phase='play';App.sfx('tick');
}
function endTurn(){
  clock.pause();S.cur=null;img=null;
  if(S.p===0){S.p=1;S.phase='ready';S.streak=0;App.sfx('end');return;}
  // both players have played this round -> decide
  const a=pts()[0],b=pts()[1];
  if(a===b){
    S.round='sd';S.sdRounds++;S.sd=[0,0];S.p=0;S.phase='ready';
    App.sfx('end');App.toast('🤝 Tie! '+(S.sdRounds>1?'Another ':'')+'30-second sudden-death round');return;
  }
  S.over=true;S.phase='over';S.result={w:a>b?0:1};
  App.sfx('end');App.sfx('win');App.confetti(6500);
}

const G={
  id:'speedmaths',name:'Speed Maths',icon:'🧮',desc:'60 s each · tally & Roman',
  open(){openState(null);},
  preset(names){openState(null);S.names=names.slice();S.f=names.slice();S.phase='ready';},
  result(){return S&&S.phase==='over'?{w:S.result.w}:null;},
  active:()=>S&&(S.phase==='play'||S.phase==='ready'),
  resumable:s=>s&&(s.phase==='play'||s.phase==='ready'),
  pause(){clock.pause();},
  field(n,v){if(n==='n1')S.f[0]=v;if(n==='n2')S.f[1]=v;},
  save(){return{S,ms:clock.left()};},
  load(o){S=o.S;clock.pause();clock.set(o.ms);expiredHandled=false;img=S.cur?TP.svgBlob(TP.mathgen.speedSVG(S.cur)):null;},

  cmd(name,arg){
    switch(S.phase){
    case'setup':
      if(name==='start'||name==='toggle'){
        const a=(S.f[0]||'').trim()||'Player 1';let b=(S.f[1]||'').trim()||'Player 2';
        if(b.toLowerCase()===a.toLowerCase())b+=' (2)';
        App.memSet('smA',(S.f[0]||'').trim());App.memSet('smB',(S.f[1]||'').trim());
        S.names=[a,b];S.phase='ready';
      }
      return;
    case'ready':
      if(name==='start'||name==='toggle')beginTurn();
      return;
    case'over':
      if(name==='rematch'||name==='toggle'){openState(S);return;}
      return false;
    }
    // play
    switch(name){
      case'toggle':if(clock.run)clock.pause();else if(clock.left()>0)clock.start();break;
      case'correct':{
        if(!clock.run)return false;
        pts()[S.p]++;S.correct[S.p]++;S.streak++;App.sfx('ok');
        if(S.streak%5===0){pts()[S.p]+=2;S.bonus[S.p]+=2;App.sfx('win');App.toast('🔥 Streak of '+S.streak+'! +2 bonus points');}
        newSum();break;}
      case'skip':case'next':if(!clock.run)return false;S.streak=0;App.sfx('tick');newSum();break;
      case'incorrect':
        if(!clock.run)return false;
        S.wrong[S.p]++;S.streak=0;App.sfx('buzz');clock.add(-1000);break;   // a wrong answer costs 1 second
      case'adj':{const [i,d]=arg.split(':');pts()[+i]=Math.max(0,pts()[+i]+ +d);break;}
      case'rematch':openState(S);break;
      default:return false;
    }
  },
  tick(){
    if(!S||S.phase!=='play')return false;
    App.beep(clock,5);
    if(clock.run&&clock.done()&&!expiredHandled){expiredHandled=true;endTurn();return true;}
    return false;
  },

  view(){
    const top={title:'🧮 Speed Maths'};
    if(S.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'info',br:1,x:'Two players, one after the other.\n60 seconds each, different sums for each player.\nWrong answer = −1 second · every 5 correct in a row = +2 bonus points'},{t:'lbl',x:'The host is choosing players…'}]};
    const sd=S.round==='sd';
    const board=S.names.map((n,i)=>({name:n,sub:S.phase==='play'&&S.p===i?(S.streak?'🔥 streak '+S.streak:'')+'':(sd?'sudden death':''),score:pts()[i],n:pts()[i],active:S.p===i&&!S.over}));
    if(S.phase==='ready'){
      const who=S.names[S.p];
      return{kind:'scene',top:Object.assign({},top,{text:sd?'Sudden death':'Round'}),
        blocks:[{t:'lbl',x:sd?'Sudden death · 30 seconds each':'60 seconds each'},{t:'text',cls:'imp-big',x:who},{t:'text',cls:'info',x:S.p===1?'Your turn next – you get different sums!':'Get ready!'}],
        btns:[{cmd:'start',label:'▶ Start '+who,cls:'green',key:'Space'}],board,snapSub:sd?'Sudden death':'Score'};
    }
    const v={kind:'scene',top:Object.assign({},top,{clock:clock.view({low:10}),text:S.names[S.p]+(sd?' · sudden death':'')}),board,snapSub:sd?'Sudden death':'Score',paused:S.phase==='play'&&!clock.run&&clock.left()>0};
    if(S.phase==='play'&&S.cur){
      v.blocks=[{t:'chip',x:S.cur.kind==='tally'?'Tally marks · how many in total?':(S.cur.sub==='conv'?'Roman numeral · what number is it?':'Roman numerals · answer in numbers or Roman numerals')},
        {t:'img',id:'i'+S.uid,blob:img,cls:'sum'},
        {t:'lbl',x:'Streak '+S.streak+' / 5 · bonus +2 every 5 in a row'}];
      v.btns=clock.run?[{cmd:'correct',label:'✔ Correct',cls:'green',key:'C'},{cmd:'skip',label:'⏭ Skip',cls:'sky',key:'S'},{cmd:'incorrect',label:'✖ Incorrect −1s',cls:'',key:'X'}]:[{cmd:'toggle',label:'▶ Resume',cls:'green',key:'Space'}];
    }else v.blocks=[];
    if(S.phase==='over'){
      const w=S.result.w,p=pts(),bd=i=>S.score[i]+' pts ('+S.correct[i]+' correct'+(S.bonus[i]?' + '+S.bonus[i]+' streak bonus':'')+')';
      v.modal={icon:'🏆',title:'Speed Maths – Final Result',winner:S.names[w]+' Wins!',
        lines:[S.names[0]+': '+bd(0),S.names[1]+': '+bd(1)].concat(S.sdRounds?['Won in sudden death ('+p[0]+' – '+p[1]+')']:[]),
        btns:[{cmd:'rematch',label:'Rematch',cls:'green',key:'Space'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
    }
    return v;
  },

  host(){
    if(S.phase==='setup')return H.sec('Players',H.field('Player 1 name','n1',S.f[0],'Player 1',18)+H.field('Player 2 name','n2',S.f[1],'Player 2',18)+
      H.row(H.btn('Continue','start',undefined,'green',{form:1}))+
      H.note('Players go one after the other (60 s each) with different sums. Easy mental maths (tallies 1–12, Roman numerals I–XX). Wrong answer −1 s. Streak of 5 correct in a row = +2 bonus. Skip or wrong answer resets the streak. Tie → 30 s sudden death.'));
    if(S.phase==='ready')return H.sec('Next up: '+esc(S.names[S.p]),H.note(S.round==='sd'?'Sudden death – 30 seconds.':'60 seconds. Sums are different from the other player\'s.')+H.row(H.btn('▶ Start '+esc(S.names[S.p]),'start',undefined,'green')));
    let h='';
    if(S.cur){
      const c=S.cur;
      h+=H.sec('Current sum – ANSWER (host only)',H.ans(c.kind==='tally'?'Tally marks: total':'Roman numerals',c.kind==='tally'?String(c.ans):c.ans+'  =  '+c.roman,
        c.kind==='tally'?c.a+' + '+c.b+' tally marks':(c.sub==='conv'?TP.mathgen.toRoman(c.a)+' = '+c.a+' – accept '+c.ans+' OR '+c.roman:TP.mathgen.toRoman(c.a)+' '+c.sym+' '+TP.mathgen.toRoman(c.b)+' ('+c.a+' '+c.sym+' '+c.b+') – accept '+c.ans+' OR '+c.roman)));
    }
    if(S.phase==='over')return h+H.sec('Finished',H.row(H.btn('Rematch','rematch',undefined,'green')+H.btn('Hub','hub',undefined,'ghost')));
    h+=H.sec('Controls – '+esc(S.names[S.p])+' ('+(S.round==='sd'?'sudden death':'60 s')+')',
      H.row(H.btn(clock.run?'⏸ Pause':'▶ Resume','toggle',undefined,clock.run?'sky':'green')+H.btn('✔ Correct','correct',undefined,'green',{dis:!clock.run})+H.btn('⏭ Skip','skip',undefined,'sky',{dis:!clock.run})+H.btn('✖ Incorrect (−1 s)','incorrect',undefined,'',{dis:!clock.run}))+
      H.note('Streak: <b>'+S.streak+'</b> / 5. Keys: Space pause · C correct · S skip · X incorrect.'));
    h+=H.sec('Score adjust',S.names.map((n,i)=>H.row('<b style="min-width:7em">'+esc(n)+'</b> '+pts()[i]+' '+H.btn('−1','adj',i+':-1','ghost')+H.btn('+1','adj',i+':1','ghost'))).join(''));
    return h;
  }
};
App.register(G);
})();
