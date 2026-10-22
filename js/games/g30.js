/* 30 SECONDS - two teams, 4 rounds each, 5 words per side, 2 points per word. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const deck=new TP.Deck(TPData.words30.items,'d30');
const TURNS=4,MEMBERS=4;
const clock=new TP.Clock(30000);
let S=null,expiredHandled=false;

const cur=()=>({team:S.turn<TURNS?0:1,round:(S.turn%TURNS)+1});
function deal(){
  const used=[],pick=()=>{const w=deck.draw(used);used.push(w);return w;};   // all 10 words on a card are unique
  S.words={blue:[0,1,2,3,4].map(pick),yellow:[0,1,2,3,4].map(pick)};
  S.st={blue:[0,0,0,0,0].map(()=>false),yellow:[0,0,0,0,0].map(()=>false)};
  S.turnPts=0;S.side='blue';
}
function resetClock(){clock.pause();clock.set(30000);expiredHandled=false;}

const G={
  id:'g30',name:'30 Seconds',icon:'⏱️',desc:'Two teams · 5 words',
  open(){
    resetClock();
    S={phase:'setup',f1:App.memGet('g30a',''),f2:App.memGet('g30b',''),names:['Team 1','Team 2'],turn:0,score:[0,0]};
  },
  active:()=>S&&S.phase==='play',
  resumable:s=>s&&s.phase==='play',
  pause(){clock.pause();},
  field(n,v){if(n==='f1')S.f1=v;if(n==='f2')S.f2=v;},
  save(){return{S,ms:clock.left()};},
  load(o){S=o.S;clock.pause();clock.set(o.ms);expiredHandled=clock.left()<=0;},

  cmd(name,arg){
    if(S.phase==='setup'){
      if(name==='start'||name==='toggle'){
        const a=(S.f1||'').trim()||'Team 1';let b=(S.f2||'').trim()||'Team 2';
        if(b.toLowerCase()===a.toLowerCase())b+=' (2)';
        App.memSet('g30a',(S.f1||'').trim());App.memSet('g30b',(S.f2||'').trim());
        S.names=[a,b];S.phase='play';S.turn=0;S.score=[0,0];resetClock();deal();App.sfx('ok');
      }
      return;
    }
    if(S.phase==='done'){
      if(name==='restart'||name==='toggle'){G.open();return;}
      if(name==='hub'||name==='back'){App.go('hub');return false;}
      return;
    }
    const {team}=cur();
    switch(name){
      case'toggle':if(clock.run)clock.pause();else{if(clock.left()<=0)return false;clock.start();App.sfx('tick');}break;
      case'reset':resetClock();break;
      case'flip':S.side=S.side==='blue'?'yellow':'blue';break;
      case'tick':{
        const i=+arg,st=S.st[S.side];
        if(st[i]){st[i]=false;S.score[team]-=2;S.turnPts-=2;}
        else{st[i]=true;S.score[team]+=2;S.turnPts+=2;App.sfx('ok');}
        break;}
      case'correct':{ // keyboard C: tick the next un-ticked word on the visible card
        const i=S.st[S.side].indexOf(false);if(i<0)return false;
        S.st[S.side][i]=true;S.score[team]+=2;S.turnPts+=2;App.sfx('ok');break;}
      case'incorrect':{ // keyboard X: undo the last ticked word
        const st=S.st[S.side];let i=st.lastIndexOf(true);if(i<0)return false;
        st[i]=false;S.score[team]-=2;S.turnPts-=2;break;}
      case'next':{
        resetClock();S.turn++;
        if(S.turn>=TURNS*2){endMatch();break;}
        deal();break;}
      case'adj':S.score[+arg.split(':')[0]]+=+arg.split(':')[1];break;
      default:return false;
    }
  },
  tick(){
    if(!S||S.phase!=='play')return false;
    App.beep(clock,5);
    if(clock.run&&clock.done()&&!expiredHandled){expiredHandled=true;clock.pause();App.sfx('end');return true;}
    return false;
  },

  view(){
    if(S.phase==='setup')return{kind:'scene',top:{title:'⏱️ 30 Seconds · Team Setup'},
      blocks:[{t:'lbl',x:'2 teams · 4 rounds each · 2 points per word · no point limit'},{t:'text',cls:'info',x:'The host is entering the team names…'}]};
    const {team,round}=cur(),blue=S.side==='blue';
    const v={kind:'scene',
      top:{left:{k:'Now playing',v:S.names[team]+' - Member #'+(((round-1)%MEMBERS)+1)},clock:clock.view({low:5}),right:{k:'Round',v:'Round '+round+' of '+TURNS}},
      blocks:[{t:'pill',side:S.side,x:blue?'BLUE SIDE':'YELLOW SIDE'},
        {t:'words',side:S.side,items:S.words[S.side].map((w,i)=>({x:w,done:S.st[S.side][i]}))},
        {t:'lbl',x:'Turn points: '+S.turnPts+' · 2 pts per word · no limit'}],
      btns:[{cmd:'toggle',label:clock.run?'⏸ Pause':'▶ Start',cls:clock.run?'sky':'green',key:'Space'},{cmd:'flip',label:'Flip card',cls:''},{cmd:'next',label:S.turn===TURNS*2-1?'End turn → Final result':(S.turn===TURNS-1?'End turn → '+S.names[1]+' starts':'End turn → Next'),cls:'navy',key:'N'}],
      board:[{name:S.names[0],score:S.score[0],n:S.score[0],active:team===0},{name:S.names[1],score:S.score[1],n:S.score[1],active:team===1}],
      snapSub:'Round '+round+' of '+TURNS+' · '+S.names[team]+' playing'};
    if(S.phase==='done'){
      const [a,b]=S.score;
      v.modal={icon:'🏆',title:'Match Complete',winner:a===b?"It's a Draw!":(a>b?S.names[0]:S.names[1])+' Wins!',lines:[S.names[0]+': '+a+'  —  '+S.names[1]+': '+b],
        btns:[{cmd:'restart',label:'Restart match',cls:'green'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
    }
    return v;
  },

  host(){
    if(S.phase==='setup')return H.sec('Team setup',H.field('Team 1 name','f1',S.f1,'Team 1',20)+H.field('Team 2 name','f2',S.f2,'Team 2',20)+
      H.row(H.btn('Start match','start',undefined,'green',{form:1}))+H.note('2 teams · 4 rounds each · 5 words per side · 2 points per word.'));
    const {team,round}=cur();
    let h=H.sec('Turn',H.note('<b>'+esc(S.names[team])+'</b> · Round '+round+' of '+TURNS+' · member #'+(((round-1)%MEMBERS)+1))+
      H.row(H.btn(clock.run?'⏸ Pause':'▶ Start','toggle',undefined,clock.run?'sky':'green')+H.btn('Reset timer','reset',undefined,'ghost')+H.btn('Flip card','flip')+H.btn('End turn → next','next',undefined,'navy')));
    h+=H.sec('Words ('+(S.side==='blue'?'BLUE':'YELLOW')+' side) – click to tick',
      '<ul class="wordlist '+S.side+'">'+S.words[S.side].map((w,i)=>'<li class="'+(S.st[S.side][i]?'done':'')+'" data-cmd="tick" data-arg="'+i+'">'+(i+1)+'. '+esc(w)+'</li>').join('')+'</ul>'+
      H.note('Turn points: '+S.turnPts+'. Keys: <b>C</b> ticks the next word, <b>X</b> undoes the last tick.'));
    h+=H.sec('Scores',S.names.map((n,i)=>H.row('<b style="min-width:8em">'+esc(n)+'</b> <span class="pts" style="font-size:1.4em;min-width:2em">'+S.score[i]+'</span>'+H.btn('−1','adj',i+':-1','ghost')+H.btn('+1','adj',i+':1','ghost'))).join(''));
    return h;
  }
};
function endMatch(){
  S.phase='done';
  const [a,b]=S.score;App.sfx('win');if(a!==b)App.confetti(5500);
}
App.register(G);
})();
