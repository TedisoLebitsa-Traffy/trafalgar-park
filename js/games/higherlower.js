/* HIGHER OR LOWER - duel format. Display shows item A with its value, then item B WITHOUT a value.
   The player says "higher" or "lower"; the host presses Correct / Incorrect. Admin sees B's true value.
   Pairs are built from verified item values inside the same set (heights, populations, areas, years, distances, ages...). */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc,D=window.TPData.hol;

/* values can be plain numbers, or {dob:'YYYY-MM-DD'} (age today) / {born:'YYYY-MM-DD',died:'YYYY-MM-DD'} (age at death) */
function ageOn(dob,on){
  const b=new Date(dob+'T00:00:00Z'),n=on||new Date();
  let a=n.getUTCFullYear()-b.getUTCFullYear();
  const m=n.getUTCMonth()-b.getUTCMonth();
  if(m<0||(m===0&&n.getUTCDate()<b.getUTCDate()))a--;
  return a;
}
function valueOf(v){
  if(typeof v==='number')return v;
  if(v.dob)return ageOn(v.dob);
  if(v.born&&v.died)return ageOn(v.born,new Date(v.died+'T00:00:00Z'));
  return NaN;
}
const SETS=D.sets;
const setById=Object.fromEntries(SETS.map(s=>[s.id,s]));
const pairs=[];
SETS.forEach(s=>{
  const its=s.items.map(it=>({n:it[0],v:valueOf(it[1])}));
  for(let i=0;i<its.length;i++)for(let j=i+1;j<its.length;j++){
    const a=its[i],b=its[j],d=Math.abs(a.v-b.v),mx=Math.max(Math.abs(a.v),Math.abs(b.v));
    const ok=s.minDiff!==undefined?d>=s.minDiff:(d/mx>=(s.gap||.07));
    if(ok&&a.v!==b.v)pairs.push({k:s.id+'|'+[a.n,b.n].sort().join('|'),s:s.id,an:a.n,av:a.v,bn:b.n,bv:b.v});
  }
});
TP.holPairs=pairs;
const deck=new TP.Deck(pairs,'dHol',p=>p.k);
const fmt=(set,v)=>{const dec=set.dec||0;return v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});};
const fv=(set,v)=>set.yearFmt?String(v):fmt(set,v);

const cfg={
  id:'higherlower',name:'Higher or Lower',icon:'📈',desc:'Is B higher or lower?',
  rules:'Item A is shown with its value. The player says whether B is higher or lower. Press Correct or Incorrect. Incorrect reveals B\'s value; press Skip/Next to continue.',
  incorrectLocks:true,
  opts:()=>({}),
  draw(S){
    S.used=S.used||[];
    const bad=p=>S.used.includes(p.s+':'+p.an)||S.used.includes(p.s+':'+p.bn)||p.s===S.lastSet;
    let p=deck.draw(bad);
    if(bad(p)){S.used=[];p=deck.draw(p2=>p2.s===S.lastSet);}
    S.used.push(p.s+':'+p.an,p.s+':'+p.bn);S.lastSet=p.s;
    // random orientation: which of the two is shown first as A
    const flip=Math.random()<.5;
    return flip?{k:p.k,s:p.s,an:p.an,av:p.av,bn:p.bn,bv:p.bv}:{k:p.k,s:p.s,an:p.bn,av:p.bv,bn:p.an,bv:p.av};
  },
  clue(it,ctx){
    const s=setById[it.s];
    return[{t:'chip',x:s.title},
      {t:'hol',a:{k:'A',name:it.an,value:fv(s,it.av),unit:s.unit},b:{k:'B',name:it.bn,value:ctx.shown?fv(s,it.bv):null,unit:ctx.shown?s.unit:''}},
      {t:'text',cls:'q',x:'Is '+it.bn+' HIGHER or LOWER than '+it.an+'?'}];
  },
  lastText(it,ok){const s=setById[it.s];return(ok?'✔ ':'✖ ')+it.bn+' = '+fv(s,it.bv)+' '+s.unit+' ('+(it.bv>it.av?'higher':'lower')+')';},
  answer(it){
    const s=setById[it.s];
    return{label:'B is…',val:it.bv>it.av?'HIGHER':'LOWER',sub:it.bn+' = '+fv(s,it.bv)+' '+s.unit+'   (A: '+it.an+' = '+fv(s,it.av)+' '+s.unit+')'};
  }
};
App.register(TP.makeDuel(cfg));
})();
