/* Trafalgar Park - phone-to-phone pairing (WebRTC data channel, no server, no internet needed).
   Host phone: "Connect a screen" shows a QR/code (offer).  Screen phone: scans it, shows a reply QR/code (answer).  Host scans the reply.
   After that both phones talk directly (over the Personal Hotspot / same Wi-Fi) - the traffic never leaves the local network.
   Needs: vendor/qrcode.js (draw QR) and vendor/jsQR.js (read QR). Camera use is optional: the code can also be pasted. */
(function(){
const TP=window.TP,esc=TP.esc;
const PREFIX='TP1.';
const cfg={iceServers:[]};          // local network only: host candidates, no STUN / TURN, zero data

/* ---------- compact codes ---------- */
const b64u=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64u=t=>{t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
/* shrink the SDP so the QR stays easy to scan: keep a couple of UDP IPv4 / .local candidates, drop IPv6 + TCP + noise */
function slim(sdp){
  let kept=0;
  return sdp.split(/\r?\n/).filter(l=>{
    if(!l)return false;
    if(/^a=(msid-semantic|extmap-allow-mixed|ice-options)/.test(l))return false;
    if(l.startsWith('a=candidate:')){
      const p=l.split(' ');
      if(p[2].toLowerCase()!=='udp'||p[4].includes(':')||kept>=2)return false;
      kept++;return true;
    }
    if(l.startsWith('a=end-of-candidates'))return false;
    return true;
  }).join('\r\n')+'\r\n';
}
async function pack(kind,sdp){
  const raw=new TextEncoder().encode(slim(sdp));
  try{
    const cs=new CompressionStream('deflate-raw'),w=cs.writable.getWriter();w.write(raw);w.close();
    return PREFIX+kind+'z'+b64u(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
  }catch(e){return PREFIX+kind+'r'+b64u(raw);}
}
async function unpack(code,kind){
  code=(code||'').trim().replace(/\s+/g,'');
  if(!code.startsWith(PREFIX+kind))throw new Error(kind==='o'?'That is not a host code':'That is not a screen reply code');
  const mode=code[PREFIX.length+1],body=unb64u(code.slice(PREFIX.length+2));
  if(mode==='r')return new TextDecoder().decode(body);
  const ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(body);w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}
function gathered(pc){
  return new Promise(res=>{
    if(pc.iceGatheringState==='complete')return res();
    const t=setTimeout(res,3500);
    pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);res();}});
  });
}
/* asking for the camera first makes the browser reveal real LAN addresses (instead of .local names) - more reliable on phones */
async function warmCamera(){
  try{const s=await navigator.mediaDevices.getUserMedia({video:true});s.getTracks().forEach(t=>t.stop());return true;}catch(e){return false;}
}

let cur=null;      // the connection being set up
function watch(pc,dc){
  const note=()=>{if(cur&&cur.onState)cur.onState(pc.connectionState,dc.readyState);};
  pc.addEventListener('connectionstatechange',note);dc.addEventListener('open',note);dc.addEventListener('close',note);
}
const core={
  /* HOST: returns the code to show. */
  async hostStart(){
    if(cur&&cur.pc)try{cur.pc.close();}catch(e){}
    const pc=new RTCPeerConnection(cfg),dc=pc.createDataChannel('tp');
    cur={pc,dc,role:'host'};TP.bus.addPeer(dc);watch(pc,dc);
    await pc.setLocalDescription(await pc.createOffer());await gathered(pc);
    return pack('o',pc.localDescription.sdp);
  },
  async hostAccept(replyCode){
    const sdp=await unpack(replyCode,'a');
    await cur.pc.setRemoteDescription({type:'answer',sdp});
  },
  /* SCREEN: takes the host's code, returns the reply code. */
  async screenJoin(hostCode){
    const sdp=await unpack(hostCode,'o');
    if(cur&&cur.pc)try{cur.pc.close();}catch(e){}
    const pc=new RTCPeerConnection(cfg);cur={pc,role:'screen'};
    pc.ondatachannel=e=>{cur.dc=e.channel;TP.bus.addPeer(e.channel);watch(pc,e.channel);};
    await pc.setRemoteDescription({type:'offer',sdp});
    await pc.setLocalDescription(await pc.createAnswer());await gathered(pc);
    return pack('a',pc.localDescription.sdp);
  },
  warmCamera,
  qrSvg(text){const q=qrcode(0,'L');q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true});},
  /* camera scanner: calls cb(text) once with the first TP1 code seen; returns stop() */
  scan(videoEl,cb){
    let stop=false,stream=null;
    const cv=document.createElement('canvas'),g=cv.getContext('2d',{willReadFrequently:true});
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{
      stream=s;videoEl.srcObject=s;videoEl.setAttribute('playsinline','');videoEl.muted=true;videoEl.play();
      (function loop(){
        if(stop)return;
        if(videoEl.videoWidth){
          const w=Math.min(videoEl.videoWidth,640),h=Math.round(videoEl.videoHeight*w/videoEl.videoWidth);
          cv.width=w;cv.height=h;g.drawImage(videoEl,0,0,w,h);
          const r=jsQR(g.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});
          if(r&&r.data.startsWith(PREFIX)){stop=true;cleanup();cb(r.data);return;}
        }
        setTimeout(loop,150);
      })();
    }).catch(()=>{videoEl.replaceWith(Object.assign(document.createElement('div'),{className:'pairnote',textContent:'Camera not available – paste the code instead.'}));});
    function cleanup(){if(stream)stream.getTracks().forEach(t=>t.stop());}
    return()=>{stop=true;cleanup();};
  },
  get state(){return cur;}
};
TP.pair=core;

/* ---------- the pairing window ---------- */
let ov=null,stopScan=null;
function close(){if(stopScan){stopScan();stopScan=null;}if(ov){ov.remove();ov=null;}}
function shell(title,html){
  if(!ov){ov=document.createElement('div');ov.className='pairov';document.body.appendChild(ov);}
  ov.innerHTML='<div class="pairbox"><button class="pairx" data-p="x">✕</button><h2>'+esc(title)+'</h2>'+html+'</div>';
  ov.querySelector('[data-p=x]').onclick=close;
  return ov;
}
function qrBlock(code){
  return '<div class="pairqr">'+core.qrSvg(code)+'</div><textarea class="pairtxt" readonly rows="3">'+esc(code)+'</textarea>'+
    '<div class="pairrow"><button class="btn small ghost" data-p="copy">📋 Copy code</button></div>';
}
function wireCopy(code){
  const b=ov.querySelector('[data-p=copy]');
  if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(code);b.textContent='✔ Copied';}catch(e){ov.querySelector('.pairtxt').select();}};
}
function connected(){return TP.bus.peerCount()>0;}
function waitConnected(){
  const t=setInterval(()=>{if(!ov){clearInterval(t);return;}if(connected()){clearInterval(t);shell('✅ Connected','<p class="pairnote">The two phones are linked. You can close this.</p><div class="pairrow"><button class="btn green" data-p="ok">OK</button></div>');ov.querySelector('[data-p=ok]').onclick=close;setTimeout(close,1500);}},400);
  core.state&&(core.state.onState=(c)=>{if(ov&&(c==='failed')){const n=ov.querySelector('.pairstat');if(n)n.textContent='⚠ Link failed – check both phones are on the same hotspot / Wi-Fi, then try again.';}});
}
/* scan-or-paste step. cb(code) gets the text; it is called once. */
function inputStep(title,intro,btnLabel,cb){
  shell(title,'<p class="pairnote">'+intro+'</p><video class="pairvid" playsinline muted></video>'+
    '<textarea class="pairtxt" id="pairpaste" rows="3" placeholder="…or paste the code here"></textarea>'+
    '<div class="pairrow"><button class="btn green" data-p="go">'+btnLabel+'</button></div><div class="pairstat"></div>');
  let done=false;
  const go=async(code)=>{if(done)return;done=true;if(stopScan){stopScan();stopScan=null;}try{await cb(code);}catch(e){done=false;ov.querySelector('.pairstat').textContent='⚠ '+e.message;}};
  stopScan=core.scan(ov.querySelector('.pairvid'),go);
  ov.querySelector('[data-p=go]').onclick=()=>go(ov.querySelector('#pairpaste').value);
}
core.openHost=async function(){
  shell('📲 Connect a screen','<p class="pairnote">Getting ready…</p>');
  await core.warmCamera();
  let code;try{code=await core.hostStart();}catch(e){shell('Could not start','<p class="pairnote">'+esc(e.message)+'</p>');return;}
  shell('📲 Connect a screen','<p class="pairnote"><b>Step 1.</b> On the <b>screen phone</b> open the game, tap <b>Join a host</b> and scan this code.</p>'+qrBlock(code)+
    '<div class="pairrow"><button class="btn green" data-p="next">Step 2 ▶ Scan the screen\'s reply</button></div>');
  wireCopy(code);
  ov.querySelector('[data-p=next]').onclick=()=>{
    inputStep('📲 Connect a screen','<b>Step 2.</b> Point this camera at the reply code shown on the screen phone.','Connect',async c=>{await core.hostAccept(c);shell('📲 Connecting…','<p class="pairnote">Linking the phones…</p><div class="pairstat"></div>');waitConnected();});
  };
};
core.openScreen=function(){
  inputStep('📲 Join a host','Scan the code shown on the <b>host phone</b> (Connect a screen).','Continue',async c=>{
    shell('📲 Join a host','<p class="pairnote">Making a reply…</p>');
    await core.warmCamera();
    const reply=await core.screenJoin(c);
    shell('📲 Join a host','<p class="pairnote"><b>Now</b> show this reply code to the host phone (it will tap <b>Step 2</b> and scan it).</p>'+qrBlock(reply)+'<div class="pairstat"></div>');
    wireCopy(reply);waitConnected();
  });
};
core.close=close;
})();
