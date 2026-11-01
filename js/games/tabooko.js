/* TABOO KNOCKOUT - type in as many names as you like. They are shuffled (crypto-random) into teams of 2 (an odd one out joins a team).
   Every team starts with ONE BOX. Boxes are the place-holders of the random draw: each round all boxes are shuffled and paired up.
   A pair is a match between the owners of the two boxes (one 90 s Taboo round each, more points wins, tie = sudden death).
   The WINNER TAKES THE LOSER'S BOX - so a winner owns two boxes and is drawn more often in the next shuffle - and the boxes are shuffled again,
   until one team owns every box. A team with no box is out. (Each match moves exactly one box.) */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const decks=TP.tabooDecks;
const clock=new TP.Clock(90000);
let S=null,expiredHandled=false;

const owners=()=>new Set(S.boxes);
const boxCount=t=>S.boxes.filter(o=>o===t).length;
const tname=t=>S.teams[t].name;
function parseNames(txt){
  const seen=new Map(),out=[];
  String(txt||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).forEach(n=>{
    const k=n.toLowerCase(),c=(seen.get(k)||0)+1;seen.set(k,c);out.push(c>1?n+' ('+c+')':n);
  });
  return out;
}
function openState(prev){
  clock.pause();clock.set(90000);expiredHandled=false;
  S={phase:'setup',names:prev?prev.names:App.memGet('tkoNames',''),diff:prev?prev.diff:App.memGet('tkoDiff','normal'),
     teams:[],boxes:[],pairs:[],rd:0,m:null,tb:null,log:[],champ:null,review:false};
}
function buildTeams(list){
  const p=TP.secureShuffle(list),teams=[];
  for(let i=0;i+1<p.length;i+=2)teams.push({players:[p[i],p[i+1]],turn:0});
  if(p.length%2)teams[teams.length-1].players.push(p[p.length-1]);
  teams.forEach(t=>{t.name=t.players.length===3?t.players[0]+', '+t.players[1]+' & '+t.players[2]:t.players.join(' & ');});
  S.teams=teams;S.boxes=teams.map((_,i)=>i);      // box i starts with team i
}
function newRound(){
  S.rd++;
  for(let tries=0;tries<60;tries++){
    const ids=TP.secureShuffle(S.boxes.map((_,i)=>i)),pairs=[];
    for(let i=0;i+1<ids.length;i+=2)pairs.push([ids[i],ids[i+1]]);     // an odd box out sits this round out
    if(pairs.some(([x,y])=>S.boxes[x]!==S.boxes[y])){S.pairs=pairs;return;}
  }
}
/* choose the next match, or crown the champion */
function nextMatch(){
  for(let guard=0;guard<500;guard++){
    if(owners().size===1){S.champ=S.boxes[0];S.phase='final';App.sfx('win');App.confetti(9000);return;}
    if(!S.pairs.length)newRound();
    const [x,y]=S.pairs.shift();
    if(S.boxes[x]===S.boxes[y])continue;             // both boxes now belong to the same team: no match
    S.m={xa:x,xb:y,ta:S.boxes[x],tb:S.boxes[y],sc:[0,0],step:0,sd:0};
    S.phase='draw';return;
  }
}
const playing=()=>S.m['t'+'ab'[S.m.step]];
function startRound(){
  const t=playing(),team=S.teams[t];
  clock.pause();clock.set(90000);expiredHandled=false;
  S.tb={score:0,log:[],cur:null,active:false,ended:false,team:t,desc:team.turn%team.players.length};
  S.phase='play';S.review=false;
}
function draw(){S.tb.cur=decks[S.diff].draw(S.tb.log.map(l=>l.w));}
function endRound(){
  if(!S.tb.active||S.tb.ended)return;
  clock.pause();
  if(S.tb.cur)S.tb.log.push({w:S.tb.cur[0],status:'Skipped',pts:0});
  S.tb.active=false;S.tb.ended=true;S.tb.cur=null;S.review=true;App.sfx('win');
}
function resolve(status,pts){
  const t=S.tb;if(!t.active||!t.cur||!clock.run)return false;
  t.log.push({w:t.cur[0],status,pts});t.score+=pts;draw();
}
function finishMatch(){
  const m=S.m,w=m.sc[0]>m.sc[1]?0:1,wt=w===0?m.ta:m.tb,lt=w===0?m.tb:m.ta,lbox=w===0?m.xb:m.xa;
  S.boxes[lbox]=wt;
  const out=boxCount(lt)===0;
  S.log.push(tname(wt)+' beat '+tname(lt)+' ('+m.sc[w]+'–'+m.sc[1-w]+') and took a box'+(out?' – '+tname(lt)+' are OUT':''));
  App.toast('🏆 '+tname(wt)+' take'+(S.teams[wt].players.length?'':'')+' the box'+(out?' – '+tname(lt)+' are out!':'!'));
  S.m=null;S.tb=null;S.review=false;
  nextMatch();
}
function contin(){
  const m=S.m,t=S.tb;
  m.sc[m.step]+=t.score;S.teams[t.team].turn++;
  S.tb=null;S.review=false;
  if(m.step===0){m.step=1;startRound();return;}
  if(m.sc[0]===m.sc[1]){m.sd++;m.sc=[0,0];m.step=0;App.toast('🤝 Tie! Sudden-death round for both teams');startRound();return;}
  finishMatch();
}
const teamRows=()=>S.teams.map((t,i)=>({name:t.name,boxes:boxCount(i),out:boxCount(i)===0,now:!!(S.m&&(S.m.ta===i||S.m.tb===i))}));

const G={
  id:'tabooko',name:'Taboo Knockout',icon:'🥊',desc:'Winner takes the box',
  open(){openState(null);},
  active:()=>S&&(S.phase==='play'||S.phase==='draw'),
  resumable:s=>s&&(s.phase==='play'||s.phase==='draw'),
  pause(){clock.pause();},
  field(n,v){if(n==='names')S.names=v;else if(n==='diff')S.diff=v;},
  save(){return{S,ms:clock.left()};},
  load(o){S=o.S;clock.pause();clock.set(o.ms);expiredHandled=clock.left()<=0;},

  cmd(name,arg){
    switch(S.phase){
    case'setup':
      if(name==='start'||name==='toggle'){
        const list=parseNames(S.names);
        if(list.length<4){App.toast('Add at least 4 names (2 teams)');return false;}
        App.memSet('tkoNames',S.names);App.memSet('tkoDiff',S.diff);
        buildTeams(list);S.log=[];S.rd=0;S.pairs=[];S.champ=null;nextMatch();App.sfx('ok');
      }
      return;
    case'draw':
      if(name==='go'||name==='toggle'||name==='next'||name==='start'){S.m.step=0;startRound();App.sfx('ok');return;}
      if(name==='reshuffle'){S.pairs.unshift([S.m.xa,S.m.xb]);S.pairs=TP.secureShuffle(S.pairs);S.m=null;nextMatch();return;}
      return false;
    case'final':
      if(name==='again'||name==='toggle'){openState(S);return;}
      if(name==='reshuffleall'){const names=parseNames(S.names);if(names.length>=4){buildTeams(names);S.log=[];S.rd=0;S.pairs=[];S.champ=null;nextMatch();}return;}
      return false;
    }
    // ---- play ----
    const t=S.tb;
    if(S.review){
      if(name==='continue'||name==='next'||name==='toggle'){contin();return;}
      if(name==='adj'){const [i,d]=arg.split(':');t.score+=0;S.m.sc[+i]=Math.max(0,S.m.sc[+i]+ +d);return;}
      return false;
    }
    switch(name){
      case'toggle':
        if(!t.active&&!t.ended){t.active=true;draw();clock.start();App.sfx('tick');}
        else if(t.active){if(clock.run)clock.pause();else clock.start();}
        break;
      case'correct':if(resolve('Guessed',2)===false)return false;App.sfx('ok');break;
      case'incorrect':if(resolve('Penalty',-1)===false)return false;App.sfx('buzz');break;
      case'skip':case'next':if(resolve('Skipped',0)===false)return false;break;
      case'end':endRound();break;
      default:return false;
    }
  },
  tick(){
    if(!S||S.phase!=='play'||!S.tb||!S.tb.active)return false;
    App.beep(clock,5);
    if(clock.run&&clock.done()&&!expiredHandled){expiredHandled=true;clock.pause();App.sfx('end');endRound();return true;}
    return false;
  },

  view(){
    const top={title:'🥊 Taboo Knockout'};
    if(S.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'info',br:1,x:'Everyone is shuffled into teams of 2.\nEach team owns ONE BOX in the draw.\nWin a match and you take the loser\'s box –\nthe boxes are shuffled again until one team owns them all!'},{t:'lbl',x:'The host is adding the players…'}]};
    if(S.phase==='draw'||S.phase==='final'){
      const m=S.m,v={kind:'scene',top:Object.assign({},top,{text:S.phase==='final'?'Final result':'Draw '+S.rd+' · '+owners().size+' teams left'}),blocks:[{t:'tko',teams:teamRows()}],snapSub:'Boxes owned'};
      v.board=S.teams.map((t,i)=>({name:t.name,sub:boxCount(i)?'boxes owned':'OUT',score:boxCount(i),n:boxCount(i),active:!!(m&&(m.ta===i||m.tb===i))}));
      if(m){
        v.blocks.push({t:'text',cls:'banner',style:'font-size:2.4em',x:tname(m.ta)+'  vs  '+tname(m.tb)});
        if(S.log.length)v.blocks.push({t:'lbl',x:S.log[S.log.length-1]});
        v.btns=[{cmd:'go',label:'▶ Start match',cls:'green',key:'Space'}];
      }
      if(S.phase==='final'){
        v.modal={icon:'🏆',title:'Taboo Knockout Champions',winner:tname(S.champ)+' win!',lines:['They own all '+S.boxes.length+' boxes after '+S.rd+' draws.'],
          btns:[{cmd:'again',label:'Play again',cls:'green',key:'Space'},{cmd:'hub',label:'Hub',cls:'ghost'}]};
      }
      return v;
    }
    const t=S.tb,m=S.m,team=S.teams[t.team],d=team.players[t.desc],g=team.players[(t.desc+1)%team.players.length];
    const blocks=[{t:'text',cls:'info',br:1,x:tname(t.team)+(m.sd?' · sudden death':'')+'\nDescriber: '+d+'  |  Guesser (blindfolded): '+g}];
    if(t.cur){blocks.push({t:'text',cls:'target',blur:1,x:t.cur[0]},{t:'lbl',x:'Forbidden words'},{t:'forbid',items:t.cur.slice(1)});}
    else blocks.push({t:'text',cls:'target',x:t.ended?'Round over':'Press Start'});
    const btns=[];
    if(!t.active&&!t.ended)btns.push({cmd:'toggle',label:'▶ Start round',cls:'green',key:'Space'});
    else if(t.active)btns.push({cmd:'toggle',label:clock.run?'⏸ Pause':'▶ Resume',cls:'sky',key:'Space'},{cmd:'correct',label:'✔ Correct +2',cls:'green',key:'C'},{cmd:'incorrect',label:'✖ Taboo −1',cls:'',key:'X'},{cmd:'skip',label:'⏭ Skip 0',cls:'sky',key:'S'});
    const live=i=>m.sc[i]+(m.step===i?t.score:0);
    const board=[{name:tname(m.ta),sub:boxCount(m.ta)+' box'+(boxCount(m.ta)>1?'es':''),score:live(0),n:live(0),active:m.step===0},{name:tname(m.tb),sub:boxCount(m.tb)+' box'+(boxCount(m.tb)>1?'es':''),score:live(1),n:live(1),active:m.step===1}];
    const v={kind:'scene',top:Object.assign({},top,{clock:clock.view({low:10}),text:'Round score: '+t.score}),blocks,btns,board,paused:t.active&&!t.ended&&!clock.run,snapSub:'Match score'};
    if(S.review){
      v.modal={icon:'',title:'Round Review · '+tname(t.team)+' · '+d+' describing',
        table:{head:['Card','Status','Pts'],rows:t.log.map(l=>{const c=l.status==='Guessed'?'g':(l.status==='Penalty'?'r':'y');return{cls:c,cells:[l.w,l.status,(l.pts>0?'+':'')+l.pts]};})},
        lines:['Guessed '+t.log.filter(l=>l.status==='Guessed').length+'×2 − Penalties '+t.log.filter(l=>l.status==='Penalty').length+'×1 = '+t.score+' points'],
        board:board.map(e=>Object.assign({},e)),btns:[{cmd:'continue',label:'Continue →',cls:'green',key:'N'}]};
    }
    return v;
  },

  host(){
    if(S.phase==='setup'){
      const n=parseNames(S.names).length;
      return H.sec('Players – one name per line (or separated by commas)',
        '<label class="fld"><span>Names ('+n+' so far – need at least 4)</span><textarea class="inp" name="names" rows="9" placeholder="Ann&#10;Bo&#10;Cy&#10;Di&#10;…">'+esc(S.names)+'</textarea></label>'+
        '<label class="fld"><span>Difficulty</span><select class="sel" name="diff"><option value="normal"'+(S.diff==='normal'?' selected':'')+'>Normal – 3 forbidden words</option><option value="hard"'+(S.diff==='hard'?' selected':'')+'>Hard – 4 forbidden words</option></select></label>'+
        H.row(H.btn('🎲 Shuffle into teams & start','start',undefined,'green',{form:1}))+
        H.note('Teams of 2 are drawn at random (an odd person joins a team). Every team starts with one box; the winner of each match takes the loser\'s box; boxes are re-shuffled each round until one team owns them all.'));
    }
    let h='';
    const rows=S.teams.map((t,i)=>H.row('<b style="min-width:12em">'+esc(t.name)+'</b> '+(boxCount(i)?'■'.repeat(boxCount(i))+' <span class="mini">'+boxCount(i)+' box'+(boxCount(i)>1?'es':'')+'</span>':'<span class="mini">OUT</span>'))).join('');
    if(S.phase==='draw'){
      const m=S.m;
      h+=H.sec('Next match – draw '+S.rd,H.ans('Up next',tname(m.ta)+'  vs  '+tname(m.tb),'The winner takes the loser\'s box ('+owners().size+' teams left, '+S.pairs.length+' more pair(s) in this draw)')+H.row(H.btn('▶ Start match','go',undefined,'green')+H.btn('🔀 Re-draw this pair','reshuffle',undefined,'ghost')));
    }else if(S.phase==='final'){
      h+=H.sec('Champions',H.note('<b>'+esc(tname(S.champ))+'</b> own every box.')+H.row(H.btn('Play again (same names)','again',undefined,'green')+H.btn('Re-shuffle same names into new teams','reshuffleall',undefined,'ghost')+H.btn('Hub','hub',undefined,'ghost')));
    }else{
      const t=S.tb,m=S.m;
      h+=H.sec('Round',H.note('<b>'+esc(tname(t.team))+'</b>'+(m.sd?' (sudden death)':'')+' · describer '+esc(S.teams[t.team].players[t.desc])+' · round score <b>'+t.score+'</b> · match '+m.sc[0]+'–'+m.sc[1])+
        H.row((t.active?H.btn(clock.run?'⏸ Pause':'▶ Resume','toggle',undefined,'sky'):(t.ended?'':H.btn('▶ Start round','toggle',undefined,'green')))+
          H.btn('✔ Correct +2','correct',undefined,'green',{dis:!t.active})+H.btn('✖ Taboo −1','incorrect',undefined,'',{dis:!t.active})+H.btn('⏭ Skip','skip',undefined,'sky',{dis:!t.active})+H.btn('End round','end',undefined,'ghost',{dis:!t.active})));
      if(t.cur)h+=H.sec('Current card (also on the display)',H.ans('Word',t.cur[0],'Forbidden: '+t.cur.slice(1).join(' · ')));
      if(S.review)h+=H.sec('Round review',H.note('Score this round: <b>'+t.score+'</b>. Fix the running match score if needed:')+
        H.row(H.btn(esc(tname(S.m.ta))+' −1','adj','0:-1','ghost')+H.btn('+1','adj','0:1','ghost')+' &nbsp; '+H.btn(esc(tname(S.m.tb))+' −1','adj','1:-1','ghost')+H.btn('+1','adj','1:1','ghost'))+H.row(H.btn('Continue →','continue',undefined,'green')));
    }
    h+=H.sec('Teams & boxes ('+owners().size+' still in)',rows+(S.log.length?'<p class="hnote">'+S.log.slice(-4).map(esc).join('<br>')+'</p>':''));
    return h;
  }
};
App.register(G);
})();
