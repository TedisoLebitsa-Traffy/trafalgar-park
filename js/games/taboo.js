/* TABOO - 4-team tournament (2 semi-finals + final), 90 s rounds, Normal (3 forbidden) / Hard (4 forbidden). */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const decks={normal:new TP.Deck(TPData.taboo.normal,'dTbN'),hard:new TP.Deck(TPData.taboo.hard,'dTbH')};
const clock=new TP.Clock(90000);
let S=null,expiredHandled=false;

const tn=i=>i===null?'TBD':S.TT.teams[i].name;
function openState(){
  clock.pause();clock.set(90000);expiredHandled=false;
  S={phase:'setup',diff:App.memGet('tbDiff','normal'),f:[1,2,3,4].map(i=>App.memGet('tbT'+i,'')),TT:null,tb:null,review:false,champ:false};
}
function newRound(){
  const m=S.TT.m[S.TT.cur],s=m.steps[m.step],ti=s.t==='a'?m.a:m.b;
  clock.pause();clock.set(90000);expiredHandled=false;
  S.tb={score:0,log:[],cur:null,active:false,ended:false,ti,teamName:S.TT.teams[ti].name,mi:S.TT.cur,si:m.step};
  S.phase='play';S.review=false;
}
function roadData(){
  const card=(m,i)=>{
    const done=m.winner!==null,now=i===S.TT.cur&&!done;
    const row=ti=>{const win=done&&m.winner===ti,sc=ti===null?'–':(ti===m.a?m.sa:m.sb);return{name:tn(ti),score:String(sc),win,lose:done&&!win};};
    return{label:m.label+(now?' · Next':'')+(done?' · Full time':''),rows:[row(m.a),row(m.b)],now,final:i===2};
  };
  return{t:'road',cards:S.TT.m.map(card)};
}
function liveScores(){
  const m=S.TT.m[S.TT.cur],s=m.steps[m.step],live=side=>(s.t===side&&S.tb?S.tb.score:0);
  return{m,s,a:m.sa+live('a'),b:m.sb+live('b')};
}
function draw(){S.tb.cur=decks[S.diff].draw(S.tb.log.map(l=>l.w));}
function end(){
  if(!S.tb.active||S.tb.ended)return;
  clock.pause();
  if(S.tb.cur)S.tb.log.push({w:S.tb.cur[0],status:'Skipped',pts:0});
  S.tb.active=false;S.tb.ended=true;S.tb.cur=null;S.review=true;App.sfx('win');
}
function resolve(status,pts){
  const t=S.tb;if(!t.active||!t.cur||!clock.run)return false;
  t.log.push({w:t.cur[0],status,pts});t.score+=pts;draw();
}
function contin(){
  const t=S.tb,TT=S.TT,m=TT.m[TT.cur],s=m.steps[m.step];
  if(s.t==='a')m.sa+=t.score;else m.sb+=t.score;
  S.review=false;S.tb=null;
  m.step++;
  if(m.step<m.steps.length){newRound();return;}
  if(m.sa===m.sb){ // tie: a sudden-death tiebreaker round for each team
    const p=(m.steps.length/2)%2===0?'A':'B';
    m.steps.push({t:'a',p,r:'Tiebreaker'},{t:'b',p,r:'Tiebreaker'});newRound();return;
  }
  m.winner=m.sa>m.sb?m.a:m.b;
  if(TT.cur<2){
    TT.cur++;
    if(TT.cur===2){TT.m[2].a=TT.m[0].winner;TT.m[2].b=TT.m[1].winner;}
    App.sfx('win');App.confetti(2800);App.toast('🎉 '+tn(m.winner)+' go through to the Final!');
    S.phase='bracket';
  }else{S.champ=true;S.phase='bracket';App.sfx('win');App.confetti(7000);}
}

const G={
  id:'taboo',name:'Taboo',icon:'🚫',desc:"Describe, don't say it",
  open:openState,
  active:()=>S&&(S.phase==='play'||S.phase==='bracket'),
  resumable:s=>s&&(s.phase==='play'||s.phase==='bracket'),
  pause(){clock.pause();},
  field(n,v){
    if(n==='diff')S.diff=v;
    else if(/^t[1-4]$/.test(n))S.f[+n[1]-1]=v;
  },
  save(){return{S,ms:clock.left()};},
  load(o){S=o.S;clock.pause();clock.set(o.ms);expiredHandled=clock.left()<=0;},

  cmd(name,arg){
    if(S.phase==='setup'){
      if(name==='diff'){S.diff=arg;return;}
      if(name==='start'||name==='toggle'){
        const used=new Set();
        const teams=S.f.map((v,i)=>{let n=(v||'').trim()||'Team '+(i+1);if(used.has(n.toLowerCase()))n+=' ('+(i+1)+')';used.add(n.toLowerCase());return{name:n};});
        S.f.forEach((v,i)=>App.memSet('tbT'+(i+1),(v||'').trim()));App.memSet('tbDiff',S.diff);
        const mk=(label,a,b)=>({label,a,b,sa:0,sb:0,step:0,winner:null,
          steps:[{t:'a',p:'A',r:'Round 1'},{t:'a',p:'B',r:'Round 2'},{t:'b',p:'A',r:'Round 1'},{t:'b',p:'B',r:'Round 2'}]});
        const o=TP.shuffle([0,1,2,3]);
        S.TT={teams,m:[mk('Semi-Final 1',o[0],o[1]),mk('Semi-Final 2',o[2],o[3]),mk('Final',null,null)],cur:0};
        S.phase='bracket';S.champ=false;App.sfx('ok');
      }
      return;
    }
    if(S.phase==='bracket'){
      if(S.champ){
        if(name==='again'||name==='toggle'){openState();return;}
        return false;
      }
      if(name==='go'||name==='toggle'||name==='next'){newRound();return;}
      return false;
    }
    // play
    const t=S.tb;
    if(S.review){
      if(name==='continue'||name==='next'||name==='toggle'){contin();return;}
      if(name==='adj'){const [i,d]=arg.split(':');const m=S.TT.m[S.TT.cur];if(+i===0)m.sa+=+d;else m.sb+=+d;return;}
      return false;
    }
    switch(name){
      case'toggle':
        if(!t.active&&!t.ended){t.active=true;draw();clock.start();App.sfx('tick');}
        else if(t.active){if(clock.run)clock.pause();else clock.start();}
        break;
      case'correct':if(resolve('Guessed',2)===false)return false;App.sfx('ok');break;
      case'incorrect':if(resolve('Penalty',-1)===false)return false;App.sfx('buzz');break;   // auto-skips to the next card
      case'skip':case'next':if(resolve('Skipped',0)===false)return false;break;
      case'end':end();break;
      case'adj':{const [i,d]=arg.split(':');const m=S.TT.m[S.TT.cur];if(+i===0)m.sa+=+d;else m.sb+=+d;break;}
      default:return false;
    }
  },
  tick(){
    if(!S||S.phase!=='play'||!S.tb||!S.tb.active)return false;
    App.beep(clock,5);
    if(clock.run&&clock.done()&&!expiredHandled){expiredHandled=true;clock.pause();App.sfx('end');end();return true;}
    return false;
  },

  view(){
    const top0={title:'🚫 Taboo Tournament'};
    if(S.phase==='setup')return{kind:'scene',top:top0,blocks:[{t:'lbl',x:'4 teams of 2 · each team plays 2 rounds (Person A, then Person B) · winners meet in the Final'},{t:'text',cls:'info',x:'Difficulty: '+(S.diff==='hard'?'HARD':'NORMAL')+'\nThe host is entering the team names…',br:1}]};
    if(S.phase==='bracket'){
      const m=S.TT.m[S.TT.cur],over=S.champ;
      const v={kind:'scene',top:Object.assign({},top0,{text:'Difficulty: '+(S.diff==='hard'?'Hard':'Normal')}),
        blocks:[{t:'text',cls:'road-title',x:'ROAD TO THE FINAL'},roadData()],
        btns:over?[]:[{cmd:'go',label:'Start '+m.label,cls:'green',key:'Space'}],
        snapRoad:roadData(),snapTitle:'Taboo Tournament'};
      if(over){
        const f=S.TT.m[2];
        v.modal={icon:'🏆',title:'Taboo Champions',winner:tn(f.winner),lines:[tn(f.a)+' '+f.sa+' — '+f.sb+' '+tn(f.b)],btns:[{cmd:'again',label:'New tournament',cls:'green'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
      }
      return v;
    }
    const t=S.tb,{m,s,a,b}=liveScores();
    const blocks=[{t:'text',cls:'info',br:1,x:m.label+' · '+t.teamName+' · '+s.r+'\nDescriber: Person '+s.p+'  |  Guesser (blindfolded): Person '+(s.p==='A'?'B':'A')}];
    if(t.cur){blocks.push({t:'text',cls:'target',blur:1,x:t.cur[0]},{t:'lbl',x:'Forbidden words'},{t:'forbid',items:t.cur.slice(1)});}
    else blocks.push({t:'text',cls:'target',x:t.ended?'Round over':'Press Start'});
    const btns=[];
    if(!t.active&&!t.ended)btns.push({cmd:'toggle',label:'▶ Start round',cls:'green',key:'Space'});
    else if(t.active)btns.push({cmd:'toggle',label:clock.run?'⏸ Pause':'▶ Resume',cls:'sky',key:'Space'},{cmd:'correct',label:'✔ Correct +2',cls:'green',key:'C'},{cmd:'incorrect',label:'✖ Taboo −1',cls:'',key:'X'},{cmd:'skip',label:'⏭ Skip 0',cls:'sky',key:'S'});
    const board=[{name:tn(m.a),score:a,n:a,active:s.t==='a'},{name:tn(m.b),score:b,n:b,active:s.t==='b'}];
    const v={kind:'scene',top:Object.assign({},top0,{clock:clock.view({low:10}),text:'Round score: '+t.score}),blocks,btns,board,paused:t.active&&!t.ended&&!clock.run,
      snapSub:m.label+' · '+t.teamName+' · '+s.r};
    if(S.review){
      v.modal={icon:'',title:'Round Review · '+t.teamName+' · Person '+s.p+' describing',
        table:{head:['Card','Status','Pts'],rows:t.log.map(l=>{const c=l.status==='Guessed'?'g':(l.status==='Penalty'?'r':'y');return{cls:c,cells:[l.w,l.status,(l.pts>0?'+':'')+l.pts]};})},
        lines:['Guessed '+t.log.filter(l=>l.status==='Guessed').length+'×2 − Penalties '+t.log.filter(l=>l.status==='Penalty').length+'×1 = '+t.score+' points'],
        board:board.map(e=>Object.assign({},e)),btns:[{cmd:'continue',label:'Continue →',cls:'green',key:'N'}]};
    }
    return v;
  },

  host(){
    if(S.phase==='setup')return H.sec('Tournament setup',
      '<div class="hgrid2">'+[1,2,3,4].map(i=>H.field('Team '+i+' name (2 people)','t'+i,S.f[i-1],'Team '+i,18)).join('')+'</div>'+
      '<label class="fld"><span>Difficulty</span><select class="sel" name="diff"><option value="normal"'+(S.diff==='normal'?' selected':'')+'>Normal – 3 forbidden words, 90 s</option><option value="hard"'+(S.diff==='hard'?' selected':'')+'>Hard – 4 forbidden words, trickier cards, 90 s</option></select></label>'+
      H.row(H.btn('Start tournament','start',undefined,'green',{form:1}))+
      H.note('Each team plays 2 rounds (Person A describes, then Person B). Winners of the two semi-finals meet in the final. Ties go to a sudden-death round.'));
    if(S.phase==='bracket'){
      if(S.champ)return H.sec('Champions!',H.row(H.btn('New tournament','again',undefined,'green')));
      const m=S.TT.m[S.TT.cur];
      return H.sec('Road to the final',H.note('Next up: <b>'+esc(m.label)+'</b> — '+esc(tn(m.a))+' vs '+esc(tn(m.b)))+H.row(H.btn('▶ Start '+esc(m.label),'go',undefined,'green')));
    }
    const t=S.tb,{m,s}=liveScores();
    let h=H.sec('Round',H.note('<b>'+esc(m.label)+' · '+esc(t.teamName)+' · '+esc(s.r)+'</b> – Describer: Person '+s.p+', Guesser: Person '+(s.p==='A'?'B':'A')+' · Round score <b>'+t.score+'</b>')+
      H.row((t.active?H.btn(clock.run?'⏸ Pause':'▶ Resume','toggle',undefined,'sky'):(t.ended?'':H.btn('▶ Start round','toggle',undefined,'green')))+
        H.btn('✔ Correct +2','correct',undefined,'green',{dis:!t.active})+H.btn('✖ Taboo −1','incorrect',undefined,'',{dis:!t.active})+H.btn('⏭ Skip','skip',undefined,'sky',{dis:!t.active})+H.btn('End round','end',undefined,'ghost',{dis:!t.active})));
    if(t.cur)h+=H.sec('Current card (also on the display)',H.ans('Word',t.cur[0],'Forbidden: '+t.cur.slice(1).join(' · ')));
    if(S.review){
      h+=H.sec('Round review',H.note('Score for this round: <b>'+t.score+'</b>. Adjust the match score if needed:')+
        H.row(H.btn(esc(tn(m.a))+' −1','adj','0:-1','ghost')+H.btn(esc(tn(m.a))+' +1','adj','0:1','ghost'))+
        H.row(H.btn(esc(tn(m.b))+' −1','adj','1:-1','ghost')+H.btn(esc(tn(m.b))+' +1','adj','1:1','ghost'))+
        H.row(H.btn('Continue →','continue',undefined,'green')));
    }else{
      h+=H.sec('Match score adjust',H.row(H.btn(esc(tn(m.a))+' −1','adj','0:-1','ghost')+H.btn('+1','adj','0:1','ghost')+' &nbsp; '+H.btn(esc(tn(m.b))+' −1','adj','1:-1','ghost')+H.btn('+1','adj','1:1','ghost')));
    }
    return h;
  }
};
App.register(G);
})();
