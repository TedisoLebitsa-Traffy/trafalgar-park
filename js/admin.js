/* Trafalgar Park - ADMIN page UI: host panel, live preview, connection indicator, resume prompt. */
(function(){
const TP=window.TP,App=window.App,$=TP.$,esc=TP.esc;

/* hub order = 4 x 2 grid; trivia stays registered but hidden */
const HUB_ORDER=['g30','taboo','imposter','picture','bottle','higherlower','proverb','speedmaths','numberhunt','tabooko','trivia'];
App.order=HUB_ORDER.filter(id=>App.games[id]).concat(App.order.filter(id=>!HUB_ORDER.includes(id)));

/* ---------- host panel ---------- */
function renderHost(){
  const h=$('#host');
  document.body.classList.toggle('picture-mode',App.screen==='game'&&App.game.id==='picture');
  // keep scroll position and focus-free redraw
  const sy=h.scrollTop;
  let html='';
  if(App.screen==='mode'){
    html=TP.H.sec('Choose a mode','<div class="chipsel"><button class="chip" data-cmd="mode" data-arg="normal">🎮 Normal – pick any single game</button><button class="chip" data-cmd="mode" data-arg="team">🏆 Team Tournament – 2 teams of 4, 4 games</button></div>');
  }else if(App.screen==='intro'){
    html=TP.H.sec('Intro screen','<p class="hnote">The display is showing the welcome screen.</p>'+TP.H.row(TP.H.btn("▶ Let's play",'play',undefined,'green')));
  }else if(App.screen==='hub'){
    html=TP.H.sec('Choose a game','<div class="chipsel">'+App.order.filter(id=>!App.games[id].hidden).map(id=>{const g=App.games[id];return '<button class="chip" data-cmd="open" data-arg="'+id+'">'+g.icon+' '+esc(g.name)+'</button>';}).join('')+'</div><p class="hnote">Clicking a card on the display page works as well.</p>');
  }else{
    const g=App.game;
    html='<div class="hhead"><h1>'+g.icon+' '+esc(g.name)+'</h1>'+
      TP.H.btn(g.id==='picture'?'Scoreboard':'📸 Scoreboard','snap',undefined,'gold')+TP.H.btn('← Hub','hub',undefined,'ghost')+'</div>'+g.host();
  }
  h.innerHTML=html;
}
App.hooks.render=renderHost;

/* collect form values into the current game's state WITHOUT redrawing (so typing is never interrupted) */
function syncFields(){
  if(App.screen!=='game'||!App.game||!App.game.field)return;
  TP.$$('#host [name]').forEach(el=>{
    const v=el.type==='checkbox'?el.checked:el.value;
    App.game.field(el.name,v);
  });
}
$('#host').addEventListener('change',e=>{
  const el=e.target;if(!el.name)return;
  if(App.game&&App.game.field)App.game.field(el.name,el.type==='checkbox'?el.checked:el.value);
});
$('#host').addEventListener('click',e=>{
  const b=e.target.closest('[data-cmd]');if(!b||b.disabled)return;
  syncFields();
  App.cmd(b.dataset.cmd,b.dataset.arg);
  b.blur();
});

/* ---------- phones: tabs, solo mode, pairing, keep-awake ---------- */
const SOLO=/[?&]solo/.test(location.search);
$('#prev').src=SOLO?'index.html?solo=1':'index.html?preview=1';
TP.keepAwake();
$('#aPair').onclick=()=>TP.pair.openHost();
$('#aGear').onclick=()=>{document.body.classList.toggle('gear');setTimeout(fitPreview,50);};
function setTab(t){
  document.body.classList.toggle('tab-screen',t==='screen');
  $('#tabHost').classList.toggle('on',t!=='screen');$('#tabScreen').classList.toggle('on',t==='screen');
  setTimeout(fitPreview,50);
}
$('#tabHost').onclick=()=>setTab('host');$('#tabScreen').onclick=()=>setTab('screen');
if(TP.isSmall())setTab(SOLO?'screen':'host');

/* ---------- top bar ---------- */
TP.$$('#top [data-nav]').forEach(b=>b.onclick=()=>{const w=b.dataset.nav;App.exit(w==='hub'?'mode':w);});
$('#aMute').onclick=()=>TP.settings.toggle('mute');
$('#aAdapt').onclick=()=>TP.settings.toggle('adapt');
$('#aHide').onclick=()=>TP.settings.toggle('hideBtns');
$('#aFull').onclick=()=>TP.toggleFullscreen();
$('#aHelp').onclick=()=>TP.localKey('help');
function syncTop(){
  $('#aMute').textContent=TP.settings.get('mute')?'Muted':'Sound on';
  $('#aMute').classList.toggle('on',TP.settings.get('mute'));
  $('#aAdapt').classList.toggle('on',TP.settings.get('adapt'));
  $('#aHide').classList.toggle('on',TP.settings.get('hideBtns'));
  $('#aHide').textContent=TP.settings.get('hideBtns')?'Display buttons hidden':'Display buttons shown';
}
TP.settings.on(syncTop);syncTop();
$('#help').innerHTML=TP.helpHTML();
$('#help').addEventListener('click',e=>{if(e.target.id==='help'||e.target.dataset.act==='closeHelp')$('#help').classList.remove('show');});

/* ---------- connection indicator ---------- */
setInterval(()=>{
  const now=Date.now(),on=App.seen.display&&now-App.seen.display<5000;
  const c=$('#conn');c.className=on?'ok':'bad';
  c.textContent=on?(TP.bus.peerCount()?'● Screen connected (phone)':(TP.bus.lan?'● Screen connected (LAN)':'● Screen connected')):'● No screen connected';
},1000);

/* ---------- live preview scaling ---------- */
function fitPreview(){
  const w=$('#prevwrap'),f=$('#prev');
  document.documentElement.style.setProperty('--hdr',$('#top').offsetHeight+'px');
  if(TP.isSmall()){                       // phone: the screen tab shows the display at its real size (no scaling)
    w.style.height='';f.style.transform='none';f.style.width=w.clientWidth+'px';f.style.height=w.clientHeight+'px';return;
  }
  const sc=w.clientWidth/1280;
  f.style.width='1280px';f.style.height='720px';
  f.style.transform='scale('+sc+')';w.style.height=(720*sc)+'px';
}
window.addEventListener('resize',fitPreview);fitPreview();

/* ---------- toast ---------- */
let tT=null;
App.hooks.toast=t=>{const e=$('#toastA');e.textContent=t;e.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>e.classList.remove('show'),3000);};

/* ---------- keyboard ---------- */
document.addEventListener('keydown',e=>{
  const cmd=TP.keyToCmd(e);if(!cmd)return;
  e.preventDefault();
  if(TP.localKey(cmd))return;
  App.cmd(cmd);
});

/* ---------- start ---------- */
App.init();
function begin(){App.ready=true;App.publish();}
/* wait for the picture manifest (so picture categories exist before a saved game is restored) */
Promise.race([TP.picturesReady||Promise.resolve(),new Promise(r=>setTimeout(r,3000))]).then(()=>{
  const saved=App.peekSave();
  if(saved){
    $('#resumeInfo').textContent='A game of '+App.games[saved.gameId].name+' was in progress. Pick up where you left off?';
    $('#resume').classList.add('show');
    $('#resumeYes').onclick=()=>{$('#resume').classList.remove('show');App.ready=true;App.restore(saved);};
    $('#resumeNo').onclick=()=>{$('#resume').classList.remove('show');App.clearSave();begin();};
    renderHost();
  }else begin();
});
window.addEventListener('beforeunload',e=>{
  if(App.screen==='game'&&App.game&&App.game.active&&App.game.active()){App.save();e.preventDefault();e.returnValue='';}
});
})();
