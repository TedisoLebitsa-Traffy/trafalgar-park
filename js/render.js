/* Trafalgar Park - DISPLAY renderer.
   Turns a "view" object (sent by the admin) into HTML. The view contains only what the
   audience is meant to see - this file has no access to game data or answers. */
(function(){
const TP=window.TP,esc=TP.esc;

/* ---- image cache: views carry {id, blob}; the same id reuses the same object URL ---- */
const imgCache=new Map(); // id -> url
function imgUrl(b){
  if(b.id&&imgCache.has(b.id))return imgCache.get(b.id);
  let url=null;
  if(b.blob instanceof Blob)url=URL.createObjectURL(b.blob);
  else if(b.dataUrl)url=b.dataUrl;
  else if(b.src)url=b.src;
  if(url&&b.id){
    imgCache.set(b.id,url);
    if(imgCache.size>14){const k=imgCache.keys().next().value;const u=imgCache.get(k);imgCache.delete(k);if(u.startsWith('blob:'))URL.revokeObjectURL(u);}
  }
  return url||'';
}

const T0=()=>performance.now();
function clockHTML(c,cls,extra){
  if(!c)return'';
  const fmt=c.fmt||'s';
  return '<span class="'+(cls||'timer')+'" data-clk data-ms="'+Math.round(c.ms)+'" data-run="'+(c.run?1:0)+'" data-t0="'+T0()+'" data-fmt="'+fmt+'" data-low="'+(c.low===undefined?10:c.low)+'">'+fmtClock(c.ms,fmt)+'</span>';
}
function fmtClock(ms,fmt){
  const s=Math.max(0,Math.ceil(ms/1000));
  return fmt==='mss'?TP.fmtT(s):String(s);
}

function btn(b){
  return '<button class="btn '+(b.cls||'')+'" data-cmd="'+b.cmd+'"'+(b.arg!==undefined?' data-arg="'+esc(b.arg)+'"':'')+(b.dis?' disabled':'')+'>'+esc(b.label)+(b.key?' <small style="opacity:.75">['+esc(b.key)+']</small>':'')+'</button>';
}
function btns(list){
  if(!list||!list.length)return'';
  return '<div class="ctrls hostbtns">'+list.map(btn).join('')+'</div>';
}

function road(r){
  const card=(c)=>{
    const rows=c.rows.map(x=>'<div class="mt '+(x.win?'win':'')+' '+(x.lose?'lose':'')+'"><span class="mn">'+esc(x.name)+'</span><span class="ms">'+esc(x.score)+'</span></div>').join('');
    return '<div class="mcard '+(c.final?'final':'')+' '+(c.now?'now':'')+'"><div class="mh">'+esc(c.label)+'</div>'+rows+'</div>';
  };
  return '<div class="road">'+card(r.cards[0])+'<div class="conn"></div><div class="fcol"><div class="trophy">🏆</div>'+card(r.cards[2])+'</div><div class="conn"></div>'+card(r.cards[1])+'</div>';
}

function block(b){
  switch(b.t){
    case'lbl':return '<div class="lbl '+(b.cls||'')+'">'+esc(b.x)+'</div>';
    case'text':return '<div class="'+(b.cls||'info')+(b.blur?' blur':'')+'"'+(b.style?' style="'+esc(b.style)+'"':'')+'>'+(b.br?esc(b.x).replace(/\n/g,'<br>'):esc(b.x))+'</div>';
    case'chip':return '<span class="cat">'+esc(b.x)+'</span>';
    case'emoji':return '<div class="pic blur '+(b.cls||'')+'">'+esc(b.x)+'</div>';
    case'img':{const u=imgUrl(b);return u?'<img class="clueimg blur '+(b.cls||'')+'" alt="" src="'+esc(u)+'">':'';}
    case'pill':return '<span class="sidepill '+b.side+'">'+esc(b.x)+'</span>';
    case'words':return '<ul class="words '+b.side+'">'+b.items.map((w,i)=>'<li class="'+(w.done?'done':'')+'" data-cmd="tick" data-arg="'+i+'"><span class="n">'+(i+1)+'.</span><span>'+esc(w.x)+'</span><span class="ck">✔ +2</span></li>').join('')+'</ul>';
    case'forbid':return '<div class="forbid blur">'+b.items.map(w=>'<span>'+esc(w)+'</span>').join('')+'</div>';
    case'road':return road(b);
    case'dots':return '<div class="dots">'+b.items.map(d=>'<span class="dot '+(d.s||'')+'">'+esc(d.x)+'</span>').join('')+'</div>';
    case'hol':{
      const side=(o,cls)=>'<div class="holc '+cls+'"><div class="lbl">'+esc(o.k)+'</div><div class="hn">'+esc(o.name)+'</div>'+
        (o.value!==null&&o.value!==undefined?'<div class="hv">'+esc(o.value)+'</div>':'<div class="hq">?</div>')+'<div class="hu">'+esc(o.unit||'')+'</div></div>';
      return '<div class="hol blur">'+side(b.a,'a')+'<div class="hol-vs">vs</div>'+side(b.b,'b')+'</div>';
    }
    case'chips':return '<div class="hchips">'+b.items.map((c,i)=>(i?'<span class="hchip arrow">→</span>':'')+'<span class="hchip '+(c.full?'full':'')+'">'+esc(c.x)+'</span>').join('')+'</div>';
    case'bottles':{
      const row=(arr,cls,labels,anim)=>'<div class="bb-row">'+arr.map((id,i)=>{
        let st='';
        if(anim&&(i===anim.a||i===anim.b)&&Date.now()-anim.t<900){const o=i===anim.a?anim.b:anim.a;st=' style="--dx:'+((o-i)*7.1)+'em"';}
        return '<div class="bb-slot '+cls+' '+(id?'filled':'')+(st?' sliding':'')+'"'+st+'>'+(id?TP.bottleSVG(id):'')+'<div class="bpos">'+(i+1)+'</div><div class="bnm">'+(id&&labels?esc(TP.bottleById(id).name):'&nbsp;')+'</div></div>';
      }).join('')+'</div>';
      let h='';
      if(b.target)h+='<div class="bb-sec"><div class="lbl">🎯 Target order for '+esc(b.who)+' (hidden from the player)</div>'+row(b.target,'tgt',true)+'</div>';
      else h+='<div class="bb-sec"><div class="lbl">🎯 Target order hidden</div>'+row([null,null,null,null,null,null],'tgt',false)+'</div>';
      h+='<div class="bb-sec"><div class="lbl">Placed so far</div>'+row(b.slots,'',true,b.anim)+'</div>';
      return '<div class="bb">'+h+'</div>';
    }
    case'wheel':{
      const n=b.slices,per=360/n,R=95,pt=(a)=>[(100+R*Math.sin(a*Math.PI/180)).toFixed(2),(100-R*Math.cos(a*Math.PI/180)).toFixed(2)];
      let sl='';
      for(let i=0;i<n;i++){
        const a1=i*per,a2=(i+1)*per,p1=pt(a1),p2=pt(a2),o=i%b.names.length;
        sl+='<path d="M100,100 L'+p1[0]+','+p1[1]+' A'+R+','+R+' 0 0 1 '+p2[0]+','+p2[1]+' Z" fill="'+(o?'#0B1F4B':'#800020')+'" stroke="#fff" stroke-width="1.5"/>'+
          '<text x="100" y="30" text-anchor="middle" font-size="'+(b.names[o].length>9?7:9)+'" font-weight="900" fill="#fff" transform="rotate('+(a1+per/2)+' 100 100)">'+esc(b.names[o].slice(0,14))+'</text>';
      }
      const sp=b.spin;
      return '<div class="wheel-wrap"><div class="wheel-ptr">▼</div><svg class="wheel" data-wheel data-id="'+(sp?sp.id:'')+'" data-deg="'+(sp?sp.deg:0)+'" data-t0="'+(sp?sp.t0:0)+'" data-ms="'+(sp?sp.ms:1)+'" data-per="'+per+'" viewBox="0 0 200 200">'+sl+'<circle cx="100" cy="100" r="9" fill="#D9A21B" stroke="#fff" stroke-width="2"/></svg></div>';
    }
    case'nhgrid':{
      let h='<div class="nh"><div></div>'+['A','B','C','D'].map(c=>'<div class="nhh">'+c+'</div>').join('');
      for(let r=0;r<4;r++){
        h+='<div class="nhh">'+(r+1)+'</div>';
        for(let c=0;c<4;c++){
          const i=r*4+c,cell=b.cells[i],up=cell.face!==null&&cell.face!==undefined;
          h+='<div class="nhcell '+(up?'up ':'')+(cell.st||'')+'" data-cmd="call" data-arg="'+i+'">'+(up?'<span class="nhnum">'+cell.face+'</span>':'<span class="nhlab">'+'ABCD'[c]+(r+1)+'</span>')+'</div>';
        }
      }
      return h+'</div>';
    }
    case'tour':return '<div class="tour'+(b.games.length>4?' n5':'')+'">'+b.games.map(g=>'<div class="tg '+g.state+'"><div class="tgh"><span>'+g.n+' · '+g.icon+' '+esc(g.name)+'</span><b>'+(g.score?g.score[0]+' – '+g.score[1]:'')+'</b></div>'+
      g.matches.map(m=>'<div class="tm '+(m.now?'now':'')+'"><span class="'+(m.w===0?'win':'')+'">'+(m.w===0?'✔ ':'')+esc(m.a)+'</span><i>vs</i><span class="'+(m.w===1?'win':'')+'">'+esc(m.b)+(m.w===1?' ✔':'')+'</span></div>').join('')+'</div>').join('')+'</div>';
    case'big':return '<div class="bb-big '+(b.cls||'')+'">'+esc(b.x)+'</div>';
    case'gap':return '<div style="height:'+(b.h||.5)+'em"></div>';
  }
  return'';
}

function board(list,snapBtn){
  if(!list||!list.length)return'';
  return '<div class="board">'+list.map(e=>'<div class="bt '+(e.active?'on':'')+'"><span class="bn">'+esc(e.name)+(e.sub?'<small>'+esc(e.sub)+'</small>':'')+'</span>'+
    (e.clock?clockHTML(e.clock,'bs'):'<span class="bs">'+esc(e.score)+(e.unit||'')+'</span>')+'</div>').join('')+
    (snapBtn?'<button class="btn small ghost snapbtn hostbtns" data-cmd="snap">📸 Scoreboard</button>':'')+'</div>';
}

function modal(m){
  if(!m)return'';
  let h='<div class="modal show"><div class="panel">';
  h+='<h2>'+esc((m.icon||'')+' '+m.title)+'</h2>';
  if(m.table)h+='<table><thead><tr>'+m.table.head.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+
    m.table.rows.map(r=>'<tr>'+r.cells.map((c,i)=>'<td class="'+(i?r.cls:'')+'">'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  if(m.winner)h+='<div class="winner">'+esc(m.winner)+'</div>';
  (m.lines||[]).forEach(l=>{h+='<div class="finalsc">'+esc(l)+'</div>';});
  if(m.road)h+=road(m.road);
  if(m.board)h+=board(m.board);
  h+=btns(m.btns)+'</div></div>';
  return h;
}
function snap(s){
  if(!s)return'';
  let body;
  if(s.road)body=road(s.road);
  else{
    const max=Math.max.apply(null,s.rows.map(r=>r.n)),tied=s.rows.every(r=>r.n===max);
    body='<div class="snaprows">'+s.rows.map(r=>'<div class="snapcard '+((!tied&&r.n===max)?'lead':'')+'"><div class="sn">'+esc(r.name)+'</div><div class="ss">'+esc(r.score)+'</div></div>').join('')+'</div>';
  }
  return '<div class="modal snap show" data-cmd="snapClose"><div class="title-main" style="font-size:3em">Trafalgar Park</div><div class="pts" style="font-size:2em">'+esc(s.title)+'</div><div class="lbl">'+esc(s.sub||'')+'</div><div style="width:100%;display:flex;justify-content:center">'+body+'</div></div>';
}

TP.renderView=function(v){
  if(!v)return'';
  if(v.kind==='wait')return '<section class="screen active" style="align-items:center;justify-content:center;gap:.6em"><div class="title-main">Trafalgar Park</div><div class="sub">'+esc(v.text||'')+'</div></section>';
  if(v.kind==='intro')return '<section id="intro" class="screen active"><div class="title-main">Trafalgar Park</div><div class="sub">Welcome to Trafalgar Park, Socialize and have fun</div><div class="hostbtns"><button class="btn" data-cmd="play">LET\'S PLAY</button></div></section>';
  if(v.kind==='hub'){
    return '<section id="hub" class="screen active"><div class="bar"><h2>'+esc(v.title||'Game Selection Hub')+'</h2><button class="btn ghost small hostbtns" data-cmd="'+(v.backCmd||'intro')+'">'+esc(v.backLabel||'← Back to Intro')+'</button></div><div class="grid" style="grid-template-columns:repeat('+(v.cards.length>8?3:(v.cards.length<=2?2:4))+',1fr);grid-template-rows:repeat('+Math.ceil(v.cards.length/(v.cards.length>8?3:(v.cards.length<=2?2:4)))+',1fr)">'+
      v.cards.map(c=>'<div class="card" data-cmd="'+(v.cmd||'open')+'" data-arg="'+esc(c.id)+'"><div class="ico">'+c.icon+'</div><div class="nm">'+esc(c.name)+'</div><div class="ds">'+esc(c.desc)+'</div></div>').join('')+'</div></section>'+snap(v.snap);
  }
  // scene
  const t=v.top||{};
  const side=(s)=>s?('<div class="team"><div class="lbl">'+esc(s.k)+'</div><div class="pts" style="font-size:1.7em">'+esc(s.v)+'</div></div>'):'';
  let bar='<div class="bar"><div class="side">'+(t.title?'<h2>'+esc(t.title)+'</h2>':'')+side(t.left)+'</div>'+
    '<div class="mid">'+(t.clock?clockHTML(t.clock,'timer'):'')+(t.text?'<div class="pts" style="font-size:1.8em">'+esc(t.text)+'</div>':'')+'</div>'+
    '<div class="side right">'+side(t.right)+'</div></div>';
  const stage='<div class="stage '+(v.paused?'paused':'')+'">'+(v.blocks||[]).map(block).join('')+btns(v.btns)+(v.foot?'<div class="lbl">'+esc(v.foot)+'</div>':'')+'</div>';
  return '<section class="screen game active">'+bar+stage+board(v.board,!!v.snapAvail)+'</section>'+modal(v.modal)+snap(v.snap);
};

/* the wheel animates from the spin start time, so re-renders never restart it */
const lastSlice=new Map();
(function loop(){
  TP.$$('[data-wheel]').forEach(el=>{
    const ms=+el.dataset.ms,deg=+el.dataset.deg,t0=+el.dataset.t0,id=el.dataset.id;
    const p=id?Math.max(0,Math.min(1,(Date.now()-t0)/ms)):0,e=1-Math.pow(1-p,3.2),d=deg*e;
    el.style.transform='rotate('+d+'deg)';
    const sl=Math.floor(d/(+el.dataset.per));
    if(id&&p<1&&lastSlice.get(id)!==sl){lastSlice.set(id,sl);if(!/[?&]preview/.test(location.search))TP.sfx.play('tick');}
  });
  requestAnimationFrame(loop);
})();

/* live clocks: counted locally from the {ms, running} the admin sent, so they stay smooth */
setInterval(function(){
  const now=T0();
  TP.$$('[data-clk]').forEach(el=>{
    let ms=+el.dataset.ms;
    if(el.dataset.run==='1')ms=Math.max(0,ms-(now-(+el.dataset.t0)));
    const txt=fmtClock(ms,el.dataset.fmt);
    if(el.textContent!==txt)el.textContent=txt;
    const secs=Math.ceil(ms/1000),low=+el.dataset.low;
    el.classList.toggle('low',secs<=low&&secs>0);
  });
},100);
})();
