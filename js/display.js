/* Trafalgar Park - DISPLAY page controller. Passive: renders what the admin sends,
   forwards button presses / key presses back to the admin as commands. */
(function(){
const TP=window.TP,$=TP.$;
const PREVIEW=/[?&]preview/.test(location.search);   // admin embeds this page as a live preview
const ROLE=PREVIEW?'preview':'display';
let cur=null, gotView=false, lastHb=0, lastView=0;

function show(v){
  cur=v;gotView=true;lastView=Date.now();
  $('#scene').innerHTML=TP.renderView(v);
}
function wait(txt){$('#scene').innerHTML=TP.renderView({kind:'wait',text:txt});}
wait('Waiting for the host… (open admin.html)');

TP.bus.on(m=>{
  if(!m||!m.t)return;
  if(m.t==='view'){show(m.view);}
  else if(m.t==='sfx'){if(!PREVIEW)TP.sfx.play(m.name);}
  else if(m.t==='confetti'){TP.confetti(m.ms);}
  else if(m.t==='toast'){toast(m.text);}
  else if(m.t==='hb'&&m.role==='admin'){lastHb=Date.now();}
});
const send=m=>{m.role=ROLE;TP.bus.send(m);};
send({t:'hello'});
setInterval(()=>{send({t:'hb'});if(!gotView)send({t:'hello'});},2000);

let toastT=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3500);}

/* clicks on any [data-cmd] element are host commands */
document.addEventListener('click',e=>{
  TP.sfx.unlock();updateChip();
  const el=e.target.closest('[data-cmd]');
  if(el&&!el.disabled){send({t:'cmd',cmd:el.dataset.cmd,arg:el.dataset.arg});}
  const act=e.target.closest('[data-act]');
  if(act&&act.dataset.act==='closeHelp')$('#help').classList.remove('show');
  if(e.target.id==='help')$('#help').classList.remove('show');
});
document.addEventListener('keydown',e=>{
  TP.sfx.unlock();updateChip();
  const cmd=TP.keyToCmd(e);if(!cmd)return;
  e.preventDefault();
  if(TP.localKey(cmd))return;
  send({t:'cmd',cmd:'key',arg:cmd});
});

/* toolbar (fades away when the mouse is still, so it never shows on stream) */
let tbT=null;
document.addEventListener('mousemove',()=>{if(PREVIEW)return;$('#app').classList.add('tb');clearTimeout(tbT);tbT=setTimeout(()=>$('#app').classList.remove('tb'),2500);});
$('#tbMute').onclick=()=>TP.settings.toggle('mute');
$('#tbAdapt').onclick=()=>TP.settings.toggle('adapt');
$('#tbFull').onclick=()=>TP.toggleFullscreen();
$('#tbHelp').onclick=()=>TP.localKey('help');
$('#help').innerHTML=TP.helpHTML();
function syncToolbar(){
  $('#tbMute').textContent=TP.settings.get('mute')?'🔇':'🔊';
  $('#tbMute').classList.toggle('on',TP.settings.get('mute'));
  $('#tbAdapt').classList.toggle('on',TP.settings.get('adapt'));
  $('#app').classList.toggle('hidebtns',TP.settings.get('hideBtns'));
}
TP.settings.on(syncToolbar);syncToolbar();
if(PREVIEW){$('#toolbar').style.display='none';}

/* status chip: "enable sound" until the browser lets us play audio; "host disconnected" if the admin vanishes */
function updateChip(){
  const chip=$('#chip');
  if(PREVIEW){chip.className='hide';return;}
  if(gotView&&lastHb&&Date.now()-lastHb>7000){chip.textContent='⚠ Host page disconnected';chip.className='';return;}
  if(!TP.sfx.isUnlocked()&&!TP.settings.get('mute')){chip.textContent='🔊 Click here once to enable sound';chip.className='';return;}
  chip.className='hide';
}
setInterval(updateChip,1000);
})();
