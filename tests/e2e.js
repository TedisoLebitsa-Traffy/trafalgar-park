/* End-to-end tests. Run inside admin.html (the admin owns the engine; its live-preview iframe is a real display instance).
   In the browser console of admin.html:   await fetch('tests/e2e.js').then(r=>r.text()).then(eval);   await E2E.all();            */
window.E2E=(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pdoc=()=>document.getElementById('prev').contentDocument;
const dom=()=>pdoc().documentElement.outerHTML.toLowerCase();
const txt=()=>pdoc().getElementById('scene').innerText;
let R=[];
const t=(n,ok,info)=>{R.push((ok?'PASS ':'FAIL ')+n+(info?'  — '+info:''));if(!ok)console.warn('FAIL',n,info);};
const go=async(c,a,ms)=>{App.cmd(c,a);await sleep(ms||90);};
const field=(n,v)=>App.game.field(n,v);
const S=()=>App.game.save().S;
const has=s=>txt().toLowerCase().includes(String(s).toLowerCase());
const leak=(what,list)=>{const d=dom();const bad=list.filter(x=>x&&String(x).length>2&&d.includes(String(x).toLowerCase()));t('no answer leak: '+what,!bad.length,bad.join(' | '));};

async function hub(){
  await go('hub');await go('intro');await sleep(100);
  t('intro shows title',has('Trafalgar Park'));
  await go('play');t('play opens the mode choice',App.screen==='mode');await go('mode','normal');
  const cards=pdoc().querySelectorAll('.card').length;
  t('hub has 10 cards',cards===10,cards+'');
  t('no Trivia / Flag Duel card',!has('Flag Duel')&&!has('Trivia'));
  t('hub order',['30 Seconds','Taboo','Imposter','Picture Game','Bottle Blind','Higher or Lower','Finish the Proverb','Speed Maths','Number Hunt','Taboo Knockout'].every((n,i)=>pdoc().querySelectorAll('.card .nm')[i].textContent===n));
}
async function g30(){
  await go('open','g30');field('f1','Reds');field('f2','Blues');await go('start');
  t('30s: 5 words shown',pdoc().querySelectorAll('.words li').length===5);
  await go('tick',0);t('30s: tick marks done + score',pdoc().querySelectorAll('.words li.done').length===1&&S().score[0]===2);
  await go('toggle');await sleep(1100);t('30s: clock runs',+pdoc().querySelector('[data-clk]').dataset.run===1&&/^(29|30)$/.test(pdoc().querySelector('[data-clk]').textContent));
  await go('toggle');await go('flip');t('30s: flip to yellow',!!pdoc().querySelector('.words.yellow'));
  const words=[...S().words.blue,...S().words.yellow];t('30s: 10 unique words on card',new Set(words).size===10);
  for(let i=0;i<8;i++)await go('next');
  t('30s: result modal',has('Match Complete')&&has('Reds Wins'));
  await go('restart');t('30s: restart to setup',S().phase==='setup');
}
async function taboo(diff){
  await go('open','taboo');field('diff',diff);['A','B','C','D'].forEach((n,i)=>field('t'+(i+1),'Team '+n));await go('start');
  t('taboo '+diff+': bracket shown',has('ROAD TO THE FINAL'));
  let rounds=0,champ=false;
  for(let guard=0;guard<30&&!champ;guard++){
    if(S().phase==='bracket'){if(S().champ){champ=true;break;}await go('go');}
    await go('toggle');
    const card=S().tb.cur;
    if(guard===0){t('taboo '+diff+': forbidden count '+(diff==='hard'?4:3),card.length-1===(diff==='hard'?4:3));t('taboo: card word on display',has(card[0]));}
    const m=S().TT.m[S().TT.cur],s=m.steps[m.step];
    if(s.t==='a')await go('correct');else await go('skip');
    t.skipLog=1;await go('end');
    if(guard===0)t('taboo: review modal',has('Round Review'));
    await go('continue');rounds++;
    if(S().champ)champ=true;
  }
  t('taboo '+diff+': champion crowned after '+rounds+' rounds',champ&&has('Taboo Champions'));
  await go('again');
}
async function imposter(){
  await go('open','imposter');
  await go('setn',6);field('two',true);for(let i=0;i<6;i++)field('p'+i,'P'+(i+1));await go('start');
  const g=S().game;t('imposter: 2 imposters at 6 players',g.imps.length===2);
  for(let i=0;i<6;i++){
    leak('imposter reveal screen '+(i+1),[g.word]);
    await go('peek');leak('imposter during peek '+(i+1),[g.word]);await go('hidepass');
  }
  t('imposter: discussion phase',S().phase==='discuss'&&has('Discussion'));
  leak('imposter discussion',[g.word]);
  await go('reveal');t('imposter: result shows word',has(g.word)&&has('secret word'));
  await go('again');await go('setn',3);for(let i=0;i<3;i++)field('p'+i,'Q'+i);await go('start');t('imposter: 3 players, 1 imposter',S().game.imps.length===1&&S().n===3);
  await go('hub');
}
async function duel(id,label,prep,leaks){
  await go('open',id);field('n1','Ann');field('n2','Ben');if(prep)await prep();await go('start');await sleep(250);
  let bad=0,seen=new Set();
  for(let i=0;i<40;i++){
    const cur=S().cur;await sleep(40);
    const a=leaks(cur);const d=dom();
    a.forEach(x=>{if(x&&String(x).length>2&&d.includes(String(x).toLowerCase())){bad++;console.warn('LEAK',id,x);}});
    if(seen.has(cur.k)&&!/^p:/.test(cur.c||''))bad+=1000;seen.add(cur.k);
    await go('skip',undefined,60);
  }
  t(label+': 40 items, no repeats, no answer in display DOM',bad===0,'problems='+bad);
  const before=S().turn;await go('correct');t(label+': correct passes turn',S().turn===1-before&&S().correct[before]===1);
  const c0=App.game.save().ms;await sleep(1100);const c1=App.game.save().ms;
  t(label+': only active clock runs',c1[1-before]<c0[1-before]&&c1[before]===c0[before]);
  await go('toggle');t(label+': pause freezes',pdoc().querySelector('.stage').classList.contains('paused'));await go('toggle');
  await go('incorrect');t(label+': incorrect keeps/locks',S().wrong[S().turn]===1);
  await go('adjt','0:-60');await go('adjt','1:-60');await sleep(700);
  t(label+': clock 0 => game over + winner modal',S().phase==='over'&&has('Wins!'),pdoc().querySelector('.modal')?'modal':'no modal');
  await go('rematch');t(label+': rematch resets clocks',App.game.save().ms[0]>59000&&S().correct[0]===0);
  await go('hub');
}
async function picture(){
  const cats=TP.pictureCats();
  for(const c of cats){
    if(c.count()===0)continue;
    await duel('picture','picture/'+c.name,async()=>{await App.game.cmd('cat',c.id);},cur=>{
      const l=[cur.a];if(cur.code)l.push('flags/','assets/');if(cur.file)l.push(cur.file,'assets/pictures');return l.filter(Boolean);});
  }
  await go('open','picture');
  const chips=[...document.querySelectorAll('#host .chip')];
  t('picture: greyed-out empty categories',chips.filter(c=>c.disabled).length>=4,chips.filter(c=>c.disabled).map(c=>c.textContent.trim()).join(', '));
  field('n1','A');field('n2','B');await go('start');
  const seenC=new Set();for(let i=0;i<60;i++){seenC.add(S().cur.c);await go('skip',undefined,30);}
  t('picture mixed: skips empty categories',![...seenC].some(c=>/^p:(Landmarks|Animals|Food|Nature)$/.test(c)),[...seenC].join(','));
  await go('hub');
}
async function hol(){
  await duel('higherlower','higher/lower',null,cur=>[]);
  await go('open','higherlower');field('n1','A');field('n2','B');await go('start');
  {let bad=0;for(let i=0;i<40;i++){const cur=S().cur,sd=TPData.hol.sets.find(x=>x.id===cur.s);const f=v=>sd.yearFmt?String(v):v.toLocaleString('en-US',{minimumFractionDigits:sd.dec||0,maximumFractionDigits:sd.dec||0});await sleep(30);const bt=pdoc().querySelector('.holc.b').textContent;if(new RegExp('(^|[^0-9.,])'+f(cur.bv).replace(/[.,]/g,'\\$&')+'($|[^0-9.,])').test(bt))bad++;await go('skip',undefined,40);}t('higher/lower: B value never in the B card (40 pairs)',bad===0,'bad='+bad);}
  await go('open','higherlower');field('n1','A');field('n2','B');await go('start');
  const cur=S().cur;t('hol: A value on display, B shows ?',has('?')&&!!pdoc().querySelector('.holc.b .hq'));
  await go('incorrect');t('hol: incorrect reveals B value',S().shown===true&&!pdoc().querySelector('.holc.b .hq'));
  await go('correct');t('hol: locked after incorrect (correct ignored)',S().correct[0]===0);
  await go('skip');await go('hub');
}
async function proverb(){
  await duel('proverb','proverb',null,cur=>[cur.e]);
  await go('open','proverb');field('n1','A');field('n2','B');await go('start');
  const cur=S().cur;t('proverb: first half shown',has(cur.s.slice(0,12)));t('proverb: second half hidden',!has(cur.e));
  await go('reveal');t('proverb: reveal shows ending',has(cur.e));
  await go('skip');const c2=S().cur;t('proverb: new item hides the ending again',!has(c2.e));
  await go('incorrect');t('proverb: Incorrect shows the correct answer on screen',S().shown===true&&S().locked===true&&has(c2.e));
  await go('correct');t('proverb: locked item ignores Correct',S().correct[0]===0);
  await go('skip');
  const easy=new Set(TPData.proverbs.easy.map(x=>x.toLowerCase()));let allEasy=true;for(let i=0;i<60;i++){if(!easy.has(S().cur.s.toLowerCase()))allEasy=false;await go('skip',undefined,25);}
  t('proverb: Easy level (default) only uses the easy list (60 draws)',allEasy&&S().opts.level==='easy');
  await go('hub');await go('open','proverb');await go('level','all');field('n1','A');field('n2','B');await go('start');
  let hard=false;for(let i=0;i<120&&!hard;i++){if(!easy.has(S().cur.s.toLowerCase()))hard=true;await go('skip',undefined,20);}
  t('proverb: All level includes the harder ones',hard&&S().opts.level==='all');
  await go('hub');
}
async function speed(){
  await go('open','speedmaths');field('n1','Zed');field('n2','Yan');await go('start');t('speed: ready screen',has('Zed')&&has('60 seconds'));
  await go('start');
  const leaks=()=>{const c=S().cur;const l=[];if(c.kind==='roman'){l.push(c.roman);}return l;};
  let bonus=false;
  for(let i=0;i<5;i++){leak('speed sum '+i,leaks());await go('correct');}
  t('speed: streak of 5 gives +2 bonus (5+2=7)',S().score[0]===7&&S().bonus[0]===2,'score='+S().score[0]);
  const ms0=App.game.save().ms;await go('incorrect');const ms1=App.game.save().ms;t('speed: wrong costs 1s',ms0-ms1>=900&&ms0-ms1<=1400,(ms0-ms1)+'ms');
  await go('skip');t('speed: skip resets streak',S().streak===0);
  const expire=async()=>{App.game.load({S:S(),ms:50});App.game.cmd('toggle');App.publish();await sleep(500);};
  await expire();
  t('speed: second player ready after first finishes',S().p===1&&S().phase==='ready',S().phase+' p='+S().p);
  await go('start');
  const seenKeys=new Set(S().seen.slice(0,-1));t('speed: player 2 gets a new sum (not repeated)',!seenKeys.has(S().cur.k));
  for(let i=0;i<5;i++)await go('correct');
  await expire();
  t('speed: tie 7-7 starts sudden death',S().round==='sd'&&S().phase==='ready'&&has('30'),'round='+S().round+' phase='+S().phase+' sc='+S().score);
  await go('start');await go('correct');await expire();
  await go('start');await expire();
  t('speed: sudden death decides winner',S().phase==='over'&&has('Zed Wins'),S().phase);
  t('speed: no summary screen, result modal with scores',has('Final Result')&&has('pts'));
  await go('hub');
}
async function bottle(){
  const tgtSvgs=()=>pdoc().querySelectorAll('.bb-slot.tgt svg').length;
  const lets={blue:'B',black:'K',red:'R',green:'G',yellow:'Y',white:'W'};
  const keyFor=id=>lets[id]==='W'?'spin':(lets[id]==='B'?'col:B':'ch:'+lets[id]);
  await go('open','bottle');field('n1','Ola');field('n2','Max');await go('start');
  const st=S();t('bottle: players have different random targets',st.targets[0].join()!==st.targets[1].join()&&new Set(st.targets[0]).size===6);
  t('bottle: step 1 hidden - no target on display, "Get ready"',tgtSvgs()===0&&has('Get ready')&&has('Target order hidden'));
  const tg=S().targets[0].slice();
  t('bottle: order never in the hidden view',!JSON.stringify(App.view()).includes(tg.join('","')));
  await go('place',tg[0]);t('bottle: play locked while order not yet shown/hidden',S().slots.every(x=>x===null));
  await go('order');t('bottle: step 2 show - 6 target bottles on display',tgtSvgs()===6&&has('Target order for Ola'));
  await go('place',tg[0]);t('bottle: play still locked while order visible',S().slots.every(x=>x===null));
  await go('order');t('bottle: step 3 hide - order gone, play unlocked',tgtSvgs()===0&&S().stage==='play'&&!has('Target order for'));
  await go('order');t('bottle: order cannot be shown again during play',S().stage==='play'&&tgtSvgs()===0);
  t('bottle: admin still sees the order panel',document.querySelectorAll('#host .miniorder svg').length===6);
  await go('eye');t('bottle: admin eye toggle hides own panel',document.querySelectorAll('#host .miniorder svg').length===0);await go('eye');
  const w=tg.slice();[w[0],w[1]]=[w[1],w[0]];[w[2],w[3]]=[w[3],w[2]];   // 2 correct
  for(const id of w)await go('place',id,40);
  await go('check');t('bottle: check shows only count (2 of 6)',has('2 of 6 in the correct place')&&S().att[0].join()==='2');
  t('bottle: no per-bottle correctness marker',!pdoc().querySelector('.bb-slot.ok,.bb-slot.right,.bb-slot.wrong'));
  t('bottle: slots stay as they are after check',S().slots.join()===w.join());
  await go('place',tg[0]);t('bottle: palette inactive after first placement',S().slots.join()===w.join());
  await go('check');t('bottle: cannot re-check an unchanged arrangement',S().att[0].length===1);
  await go('sel','1');await go('sel','2');t('bottle: two positions selected',S().sel.length===2);
  await go('sel','2');t('bottle: pressing a selected button deselects',S().sel.join()==='1');
  await go('sel','2');await go('swap');
  t('bottle: swap exchanges the two slots, no new attempt',S().slots[0]===w[1]&&S().slots[1]===w[0]&&S().att[0].length===1);
  t('bottle: swap keeps old count, greyed',has('2 of 6')&&!!pdoc().querySelector('.bb-big.grey'));
  t('bottle: display mirrors arrangement',pdoc().querySelectorAll('.bb-sec:last-child .bb-slot svg').length===6);
  await go('undoswap');t('bottle: undo swap restores arrangement',S().slots.join()===w.join()&&!pdoc().querySelector('.bb-big.grey'));
  await go('sel','1');await go('sel','2');await go('swap');
  await go('swapmode','col');t('bottle: colour mode remembered',App.memGet('bbMode')==='col');
  const c3=S().slots[2],c4=S().slots[3];
  App.cmd('key',keyFor(c3));await sleep(60);App.cmd('key',keyFor(c4));await sleep(60);
  t('bottle: two colours selected via keyboard',S().sel.length===2,S().sel.join());
  App.cmd('key','confirm');await sleep(100);
  t('bottle: colour swap exchanged them wherever they sit',S().slots[2]===c4&&S().slots[3]===c3&&S().slots.join()===tg.join());
  await go('back');
  await go('check');t('bottle: second check = 6 of 6, 2 attempts',S().fin===true&&S().att[0].join()==='2,6');
  t('bottle: history chips',pdoc().querySelectorAll('.hchip:not(.arrow)').length===2);
  await go('swapmode','pos');
  await go('undocheck');t('bottle: undo last check removes attempt',S().att[0].join()==='2'&&!S().fin);
  await go('check');t('bottle: re-check after undo',S().fin&&S().att[0].join()==='2,6');
  const saved=JSON.parse(JSON.stringify(App.game.save()));App.game.load(saved);App.publish();await sleep(100);
  t('bottle: resume restores stage, slots, attempts',S().stage==='play'&&S().slots.join()===tg.join()&&S().att[0].join()==='2,6'&&tgtSvgs()===0);
  await go('continue');t('bottle: player 2 starts hidden again',S().p===1&&S().stage==='hidden'&&tgtSvgs()===0);
  await go('order');await go('order');
  const t2=S().targets[1];for(const id of t2)await go('place',id,30);await go('check');t('bottle: p2 finishes in 1',S().att[1].length===1);
  await go('continue');t('bottle: fewer attempts wins',S().phase==='over'&&has('Max Wins'));
  await go('rematch');t('bottle: rematch new game, hidden',S().att[0].length===0&&S().stage==='hidden'&&tgtSvgs()===0);
  for(const pl of [0,1]){await go('order');await go('order');const tt=S().targets[pl];for(const id of tt)await go('place',id,25);await go('check');await go('continue');}
  t('bottle: tie triggers tiebreaker round (hidden, new targets)',S().round===2&&S().p===0&&S().att[0].length===0&&S().stage==='hidden'&&tgtSvgs()===0);
  await go('hub');
}
async function speedgen(){
  const R=n=>TP.mathgen.toRoman(n);const bad=[],kinds={tally:0,add:0,sub:0,conv:0};
  const okNum=/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/;
  for(let i=0;i<500;i++){
    const q=TP.mathgen.speed();
    if(q.kind==='tally'){kinds.tally++;if(!(q.a>=1&&q.a<=12&&q.b>=1&&q.b<=12&&q.a+q.b<=20&&Math.ceil(q.a/5)<=3&&Math.ceil(q.b/5)<=3&&q.ans===q.a+q.b))bad.push(JSON.stringify(q));}
    else{kinds[q.sub]++;
      const vals=q.sub==='conv'?[q.a,q.ans]:[q.a,q.b,q.ans];
      if(vals.some(v=>v<1||v>20))bad.push(JSON.stringify(q));
      if(q.sub==='add'&&q.a+q.b!==q.ans)bad.push(JSON.stringify(q));
      if(q.sub==='sub'&&(q.a-q.b!==q.ans||q.ans<1))bad.push(JSON.stringify(q));
      if(q.sub==='conv'&&q.ans!==q.a)bad.push(JSON.stringify(q));
      if(TP.mathgen.fromRoman(q.roman)!==q.ans)bad.push('roman '+JSON.stringify(q));
      [q.a,q.b].filter(Boolean).forEach(v=>{if(!okNum.test(R(v)))bad.push('numeral '+R(v));});
    }
  }
  t('speed: 500 generated questions stay within limits',!bad.length,bad.slice(0,3).join(' | ')+' kinds='+JSON.stringify(kinds));
  t('speed: all question types occur',kinds.tally>0&&kinds.add>0&&kinds.sub>0&&kinds.conv>0);
  await go('open','speedmaths');field('n1','Zed');field('n2','Yan');await go('start');await go('start');
  for(let i=0;i<30;i++)await go('skip',undefined,15);
  const seen=S().seen;t('speed: no repeats within a round (30 sums)',new Set(seen).size===seen.length);
  const expire=async()=>{App.game.load({S:S(),ms:50});App.game.cmd('toggle');App.publish();await sleep(500);};
  await expire();await go('start');for(let i=0;i<20;i++)await go('skip',undefined,15);
  const all=S().seen;t('speed: second player never gets a first-player sum',new Set(all).size===all.length);
  await go('hub');
}
async function tournament(){
  const T=()=>App.game.save().S;
  const sub=()=>App.game.save().sub;
  const ids=()=>T().games;
  async function play(winnerTeam){
    await go('tstart');
    const hv=App.games[T().games[T().gi]];
    await go('start');                                   // sub-game: Start (duel/speed)
    if(winnerTeam===0){await go('correct');await go('adjt','1:-60');}else await go('adjt','0:-60');
    await sleep(700);
  }
  await go('hub');await go('mode');
  t('tour: mode screen shows Normal and Team Tournament',App.screen==='mode'&&has('Team Tournament')&&has('Normal'));
  await go('mode','normal');t('tour: normal mode opens the hub',App.screen==='hub'&&pdoc().querySelectorAll('.card').length===10);
  await go('mode');await go('mode','team');
  t('tour: setup screen',App.screen==='game'&&App.game.id==='tournament'&&T().phase==='setup');
  field('t0','Lions');field('t1','Tigers');['Ann','Bo','Cy','Di','Eve','Fay','Gus','Hal'].forEach((n,i)=>field('p'+i,n));
  ['higherlower','proverb','picture','higherlower'].forEach((g,i)=>field('g'+i,g));field('fmt','big');
  await go('start');
  t('tour: overview shows 4 game cards and pairings',pdoc().querySelectorAll('.tg').length===4&&has('Ann')&&has('Eve')&&has('vs'));
  t('tour: pairing order 1v1..4v4',T().pairs[0].map(p=>p.join('')).join()==='00,11,22,33');
  // game 1: A,A,B,B -> sudden death -> A
  for(const w of [0,0,1,1]){await play(w);t.n=1;await go('tcontinue');}
  t('tour: 2-2 triggers sudden-death match',T().mi===4&&T().pairs[0].length===5&&T().phase==='between');
  await play(0);await go('tcontinue');
  t('tour: sudden death decides game 1 for Lions',T().gdone[0]===0&&T().gw.join()==='1,0'&&T().gi===1&&T().mi===0);
  // game 2: B,B,A,A + SD B
  for(const w of [1,1,0,0]){await play(w);await go('tcontinue');}await play(1);await go('tcontinue');
  t('tour: game 2 to Tigers (1-1)',T().gw.join()==='1,1');
  // game 3 (picture): A,A,A,B -> Lions
  for(const w of [0,0,0,1]){await play(w);
    if(w===0&&T().mi===0)t('tour: match shows team footer + Continue only',has('Lions vs Tigers')&&has('Continue')&&!has('Rematch'));
    await go('tcontinue');}
  t('tour: game 3 to Lions (2-1)',T().gw.join()==='2,1'&&T().gi===3);
  // resume mid-match
  await go('tstart');await go('start');
  const saved=JSON.parse(JSON.stringify(App.game.save()));App.game.load(saved);App.publish();await sleep(100);
  t('tour: resume restores tournament and running match',T().phase==='match'&&!!sub()&&sub().id==='higherlower');
  // game 4: B,B,B,A (this match in progress counts: finish as B)
  await go('toggle');await go('adjt','0:-60');await sleep(700);await go('tcontinue');
  for(const w of [1,1,0]){await play(w);await go('tcontinue');}
  t('tour: game 4 to Tigers -> 2-2 needs decider',T().gw.join()==='2,2'&&T().phase==='decider'&&has('2 – 2'));
  await go('tdecide','proverb');t('tour: decider game added',T().games.length===5&&T().gi===4&&T().phase==='between');
  for(const w of [1,1,1,0]){await play(w);await go('tcontinue');}
  t('tour: champion crowned (Tigers 3-2)',T().phase==='final'&&T().champ===1&&has('Tigers win!'));
  await go('trematch');t('tour: rematch keeps teams, resets scores',T().phase==='between'&&T().gw.join()==='0,0'&&T().teams[0].name==='Lions'&&T().games.length===4);
  await go('back');await go('back');
  t('tour: leaving goes back to mode screen',App.screen==='mode');
  // bottle and speed maths inside the tournament
  await go('mode','team');field('t0','X');field('t1','Y');['bottle','speedmaths','bottle','bottle'].forEach((g,i)=>field('g'+i,g));await go('start');
  await go('tstart');
  t('tour: bottle match preset with member names',sub().id==='bottle'&&/Ann/.test(JSON.stringify(sub().state.S.names)));
  const b=App.games.bottle,bs=()=>b.save().S;
  await go('order');await go('order');const tg=bs().targets[0].slice();for(const id of tg)await go('place',id,25);await go('check');await go('continue');
  await go('order');await go('order');const t2=bs().targets[1].slice();const w=t2.slice();[w[0],w[1]]=[w[1],w[0]];for(const id of w)await go('place',id,25);await go('check');
  await go('sel','1');await go('sel','2');await go('swap');await go('check');await go('continue');await sleep(200);
  t('tour: bottle match completes inside tournament (X wins on fewer attempts)',T().res[0][0]===0&&has('Point for X'));
  await go('tcontinue');
  await go('tstart');await go('tcontinue');
  t('tour: cannot continue an unfinished match',T().phase==='match');
  await go('hub');await go('hub');await go('mode','team');field('t0','X');field('t1','Y');['speedmaths','bottle','bottle','bottle'].forEach((g,i)=>field('g'+i,g));field('fmt','big');await go('start');
  await go('tstart');
  const sm=App.games.speedmaths;await go('start');await go('correct');
  sm.load({S:sm.save().S,ms:50});sm.cmd('toggle');App.publish();await sleep(500);await go('start');
  sm.load({S:sm.save().S,ms:50});sm.cmd('toggle');App.publish();await sleep(600);
  t('tour: speed maths match completes inside tournament',T().res[0][0]===0,JSON.stringify(T().res[0]));
  await go('tcontinue');await go('hub');await go('hub');
}
async function quicktour(){
  const T=()=>App.game.save().S;
  async function play(w){await go('tstart');await go('start');if(w===0){await go('correct');await go('adjt','1:-60');}else await go('adjt','0:-60');await sleep(700);}
  await go('hub');await go('mode');await go('mode','team');
  field('t0','Lions');field('t1','Tigers');['Ann','Bo','Cy','Di','Eve','Fay','Gus','Hal'].forEach((n,i)=>field('p'+i,n));
  ['higherlower','proverb','picture','higherlower'].forEach((g,i)=>field('g'+i,g));
  t('quick: format selector offers quick and big',document.querySelectorAll('#host select[name=fmt] option').length===2);
  field('fmt','quick');await go('start');
  t('quick: one pairing per game (player k plays game k)',T().format==='quick'&&T().pairs.map(p=>p.length+':'+p[0].join('')).join()==='1:00,1:11,1:22,1:33');
  const names=[];
  for(const w of [0,1,0,1]){
    await go('tstart');names.push(App.game.save().sub.state.S.names.join('/'));await go('adjt','0:0');
    await go('start');if(w===0){await go('correct');await go('adjt','1:-60');}else await go('adjt','0:-60');await sleep(700);
    await go('tcontinue');
  }
  t('quick: players matched by game number',names.join()==='Ann/Eve,Bo/Fay,Cy/Gus,Di/Hal',names.join());
  t('quick: one match decides each game; 2-2 -> decider',T().gw.join()==='2,2'&&T().phase==='decider');
  await go('tdecide','proverb');t('quick: decider is a single random-pair match',T().games.length===5&&T().pairs[4].length===1&&T().pairs[4][0][0]===T().pairs[4][0][1]);
  await play(1);await go('tcontinue');
  t('quick: champion after decider (Tigers 3-2)',T().phase==='final'&&T().champ===1&&has('Tigers win!'));
  t('quick: only 5 matches were played in total',T().res.reduce((n,r)=>n+r.length,0)===5);
  await go('hub');await go('hub');
}
async function tabooko(){
  const S_=()=>App.game.save().S;
  await go('open','tabooko');
  field('names','Ann\nBo, Cy;Di\nEve\nFay\nGus\nHal\nIan\nJo\nbo');
  await go('start');
  const s=S_();
  const n=11;   // 'bo' duplicated -> "bo (2)"; so 11 names
  t('tko: 11 names -> 5 teams (one team of 3)',s.teams.length===5&&s.teams.filter(x=>x.players.length===3).length===1&&s.teams.flatMap(x=>x.players).length===n,s.teams.map(x=>x.players.length).join());
  t('tko: duplicate name kept distinct',s.teams.flatMap(x=>x.players).includes('bo (2)'));
  t('tko: each team starts with one box',s.boxes.join()==='0,1,2,3,4');
  t('tko: draw screen shows teams and a matchup',pdoc().querySelectorAll('.tkot').length===5&&has(' vs ')&&has('Start match'));
  let matches=0,sdSeen=false,maxBoxes=1,guard=0,tieDone=false;
  while(S_().phase!=='final'&&guard++<40){
    const m=S_().m;await go('go');
    // team A scores, team B scores according to scenario
    const play=async(pts)=>{await go('toggle');for(let i=0;i<pts;i++)await go('correct');if(pts===0)await go('skip');await go('end');await go('continue');};
    if(!tieDone){await play(0);await play(0);tieDone=true;sdSeen=S_().m&&S_().m.sd===1;}   // tie 0-0 -> sudden death
    await play(2);await play(1);                                                                   // team A wins
    matches++;
    const owned=S_().boxes.reduce((a,o)=>(a[o]=(a[o]||0)+1,a),{});maxBoxes=Math.max(maxBoxes,...Object.values(owned));
    t.last=S_().boxes.join();
    if(matches===1)t('tko: winner took the loser\'s box (2 boxes, loser has 0)',Object.values(owned).includes(2)&&S_().boxes.length===5&&Object.keys(owned).length===4,JSON.stringify(owned));
  }
  t('tko: tie triggers sudden death',sdSeen);
  t('tko: at least N-1 = 4 matches were needed and it terminated',matches>=4&&matches<60,matches+'');
  t('tko: champion owns every box',S_().phase==='final'&&new Set(S_().boxes).size===1&&has('Champions'));
  t('tko: boxes grow as teams win',maxBoxes>=2);
  await go('again');t('tko: play again returns to setup with names kept',S_().phase==='setup'&&S_().names.includes('Ann'));
  field('names','A\nB\nC');await go('start');t('tko: needs at least 4 names',S_().phase==='setup');
  await go('hub');
}
async function numberhunt(){
  const decG=s=>{const K=[0x5b,0xa7,0x13,0xe9,0x2d,0x71,0xc4,0x8f];return Array.from(atob(s)).map((c,i)=>((c.charCodeAt(0)^K[i%8])&255)-37);};
  const nums=()=>[...pdoc().querySelectorAll('.nhnum')].map(e=>e.textContent);
  const hostNums=()=>/(^|\D)(1[0-6]|[1-9])(\D|$)/.test([...document.querySelectorAll('#host .nhg button')].map(b=>b.textContent).join(' ').replace(/[A-D][1-4]/g,''));
  const logs=[];const ol=console.log,ow=console.warn;console.log=(...a)=>{logs.push(a.join(' '));ol(...a)};
  await go('open','numberhunt');field('n1','Ann');field('n2','Ben');await go('start');
  t('nh: wheel phase, no spin yet',S().phase==='wheel'&&!!pdoc().querySelector('svg.wheel'));
  t('nh: grid not shown before play',nums().length===0);
  await go('spin');t('nh: spin creates wheel result',!!S().wheel&&S().wheel.winner>=0);
  await sleep(5200);t('nh: wheel lands -> banner',has('starts!')&&S().wheel.fin);
  const starter=S().wheel.winner;await go('continue');t('nh: starter plays first',S().phase==='play'&&S().turn===starter);
  t('nh: no number visible on display at rest',nums().length===0&&pdoc().querySelectorAll('.nhcell').length===16);
  t('nh: admin host shows no numbers on cells',!hostNums());
  const G_=decG(S().g);t('nh: grid is a permutation of 1-16',[...G_].sort((a,b)=>a-b).join()===[...Array(16).keys()].map(i=>i+1).join());
  t('nh: autosave does not contain readable grid',!JSON.stringify(App.game.save()).includes(JSON.stringify(G_)));
  const idx=n=>G_.indexOf(n);
  // correct tap
  let p=S().turn;await go('call',idx(1),30);
  t('nh: correct cell shows number then flips back',nums().join()==='1'&&S().prog[p]===1);
  await go('call',idx(2),30);t('nh: taps ignored during reveal',S().prog[p]===1);
  await sleep(1150);t('nh: flips back after 1s',nums().length===0&&!S().rev);
  // wrong cell: resets + passes
  await go('call',idx(5),30);t('nh: wrong cell resets progress and passes turn',S().prog[p]===0&&S().turn===1-p&&has('found 0 of 16'));
  await sleep(1150);
  // undo
  await go('undo');t('nh: undo restores progress and turn',S().prog[p]===1&&S().turn===p);
  // other player gets a turn properly, then back
  await go('call',idx(9),30);await sleep(1150);t('nh: turn passed',S().turn===1-p);
  await go('call',idx(1),30);await sleep(1150);await go('call',idx(3),30);await sleep(1150);t('nh: second player progresses 1',S().prog[1-p]===1||S().prog[p]===0);
  // keyboard C then 2
  await go('restart');await go('start');await go('spin');await sleep(5200);await go('continue');
  const G2=decG(S().g);p=S().turn;
  // keyboard test below
  const g1=G2.indexOf(1);const lab='ABCD'[g1%4];
  await go('key',lab==='C'?'correct':'col:'+lab);await go('key','row:'+(Math.floor(g1/4)+1),40);
  t('nh: keyboard letter+number calls cell',S().prog[p]===1);
  await sleep(1150);
  // full game to 16 by player p
  for(let n=2;n<=16;n++){await go('call',G2.indexOf(n),20);await sleep(1080);}
  await sleep(1400);
  t('nh: 16 in a row wins',S().phase==='over'&&has('Wins!')&&S().winner===p);
  await go('rematch');t('nh: rematch -> new shuffle + wheel',S().phase==='wheel'&&S().g!==undefined&&!S().wheel);
  // pause + resume after reload simulation
  await go('spin');await sleep(5200);await go('continue');
  const GR=decG(S().g);const pp=S().turn;await go('call',GR.indexOf(1),20);await sleep(1100);
  const saved=JSON.parse(JSON.stringify(App.game.save()));App.game.load(saved);App.publish();await sleep(100);
  t('nh: resume restores progress, turn and hidden grid',S().prog[pp]===1&&S().turn===pp&&decG(S().g).join()===GR.join());
  await go('call',GR.indexOf(2),20);await sleep(1100);t('nh: play continues after resume',S().prog[pp]===2);
  t('nh: nothing logged to console',!logs.some(l=>/(grid|GRID)/.test(l)));console.log=ol;
  await go('hub');
}
async function misc(){
  await go('open','g30');field('f1','X');field('f2','Y');await go('start');
  await sleep(1200);t('autosave writes to localStorage',!!localStorage.getItem('trafalgar_park_v2')&&JSON.parse(localStorage.getItem('trafalgar_park_v2')).gameId==='g30');
  await go('snap');t('snapshot scoreboard overlay',!!pdoc().querySelector('.modal.snap'));await go('snapClose');t('snapshot closes',!pdoc().querySelector('.modal.snap'));
  await go('back');t('esc #1 only warns',App.screen==='game');await go('back');t('esc #2 leaves to hub',App.screen==='hub');
  await go('hub');
}
async function all(){
  R=[];
  for(const [n,f] of [['hub',hub],['g30',g30],['taboo-normal',()=>taboo('normal')],['taboo-hard',()=>taboo('hard')],['imposter',imposter],['picture',picture],['hol',hol],['proverb',proverb],['speed',speed],['speedgen',speedgen],['bottle',bottle],['numberhunt',numberhunt],['tournament',tournament],['quicktour',quicktour],['tabooko',tabooko],['misc',misc]]){
    try{await f();}catch(e){t(n+' threw',false,e.message+' '+(e.stack||'').split('\n')[1]);}
  }
  return R;
}
return{all,tabooko,quicktour,tournament,speedgen,numberhunt,hub,g30,taboo,imposter,picture,hol,proverb,speed,bottle,misc,duel,results:()=>R,reset:()=>{R=[];}};
})();
