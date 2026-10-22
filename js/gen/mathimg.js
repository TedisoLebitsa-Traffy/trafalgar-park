/* Programmatic maths problems + the SVG images they are drawn as (tally marks, Roman numerals, plain sums).
   Used by Picture Game "Maths" and by Speed Maths. Admin page only (the display just receives the picture). */
(function(){
const TP=window.TP;
const NAVY='#0B1F4B',BURG='#800020';
const FONT="font-family=\"'Segoe UI',Roboto,Arial,sans-serif\" font-weight=\"900\"";

function toRoman(n){
  const m=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s='';for(const [v,r] of m){while(n>=v){s+=r;n-=v;}}return s;
}
function fromRoman(s){
  const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};s=s.toUpperCase();let t=0;
  for(let i=0;i<s.length;i++){const a=v[s[i]],b=v[s[i+1]]||0;t+=a<b?-a:a;}return t;
}
function textSVG(txt,opt){
  opt=opt||{};
  const W=opt.w||1000,H=opt.h||300;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+
    '<text x="'+W/2+'" y="'+(H/2+opt.size*0.34)+'" text-anchor="middle" font-size="'+opt.size+'" '+(opt.font||FONT)+' fill="'+NAVY+'">'+txt+'</text></svg>';
}
/* a plain sum, e.g.  47 + 38 = ?  */
function sumSVG(a,sym,b){
  const body=a+' '+sym+' '+b+' = <tspan fill="'+BURG+'">?</tspan>';
  const len=(a+' '+sym+' '+b+' = ?').length;
  return textSVG(body,{w:1000,h:260,size:Math.min(170,Math.floor(1000/(len*0.62)))});
}
/* tally marks: groups of five (four strokes + a diagonal) */
function tallyGroup(x0,n,cls){
  let s='';const sp=17;
  const strokes=Math.min(4,n);
  for(let i=0;i<strokes;i++)s+='<line x1="'+(x0+i*sp)+'" y1="30" x2="'+(x0+i*sp)+'" y2="190" />';
  if(n>=5)s+='<line x1="'+(x0-12)+'" y1="165" x2="'+(x0+3*sp+12)+'" y2="55" />';
  return s;
}
function tallySet(x0,n){
  let s='',x=x0,left=n,groups=0;
  while(left>0){const g=Math.min(5,left);s+=tallyGroup(x,g);left-=g;x+=95;groups++;}
  return{svg:s,w:groups*95};
}
function tallySVG(a,b){
  const A=tallySet(40,a),pad=70,B=tallySet(40+A.w+pad*2,b),W=40+A.w+pad*2+B.w+170;
  const midx=40+A.w+pad-10;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' 230" width="'+W+'" height="230">'+
    '<g stroke="'+NAVY+'" stroke-width="11" stroke-linecap="round">'+A.svg+B.svg+'</g>'+
    '<text x="'+midx+'" y="150" text-anchor="middle" font-size="110" '+FONT+' fill="'+BURG+'">+</text>'+
    '<text x="'+(W-80)+'" y="150" text-anchor="middle" font-size="110" '+FONT+' fill="'+NAVY+'">= <tspan fill="'+BURG+'">?</tspan></text></svg>';
}
const ROMAN_FONT="font-family=\"'Times New Roman',Georgia,serif\" font-weight=\"700\"";
function romanSVG(a,sym,b){
  const t=toRoman(a)+' '+sym+' '+toRoman(b)+' = <tspan fill="'+BURG+'">?</tspan>';
  const len=(toRoman(a)+' '+sym+' '+toRoman(b)+' = ?').length;
  return textSVG(t,{w:1100,h:260,size:Math.min(150,Math.floor(1100/(len*0.64))),font:ROMAN_FONT});
}

function convSVG(n){
  return textSVG(toRoman(n)+' = <tspan fill="'+BURG+'">?</tspan>',{w:1000,h:260,size:170,font:ROMAN_FONT});
}
TP.mathgen={
  toRoman,fromRoman,
  /* ---- Picture Game maths: 4 sub-types ---- */
  PIC_SUBS:['add','sub','mul','div'],
  picture(sub){
    sub=sub||TP.pick(TP.mathgen.PIC_SUBS);
    let a,b,ans,sym;
    if(sub==='add'){a=TP.rnd(12,189);b=TP.rnd(11,99);ans=a+b;sym='+';}
    else if(sub==='sub'){a=TP.rnd(31,199);b=TP.rnd(11,a-6);ans=a-b;sym='−';}
    else if(sub==='mul'){if(Math.random()<.5){a=TP.rnd(3,12);b=TP.rnd(3,15);}else{a=TP.rnd(11,29);b=TP.rnd(3,9);}ans=a*b;sym='×';}
    else{const d=TP.rnd(3,12),q=TP.rnd(3,15);a=d*q;b=d;ans=q;sym='÷';}
    return{kind:'maths',sub,a,b,sym,ans,k:'maths:'+sub+':'+a+':'+b};
  },
  pictureSVG:it=>sumSVG(it.a,it.sym,it.b),
  /* ---- Speed Maths: easy mental maths. Tallies: two sets of 1-12 marks (max 3 groups of five each), total <= 20.
     Roman numerals: only I to XX: add (answer <= 20), subtract (answer > 0) or convert one numeral to a number. ---- */
  speed(){
    const r=Math.random();
    if(r<.4){
      let a,b;do{a=TP.rnd(1,12);b=TP.rnd(1,12);}while(a+b>20);
      return{kind:'tally',a,b,ans:a+b,k:'tally:'+a+':'+b};
    }
    if(r<.7){const a=TP.rnd(1,19),b=TP.rnd(1,20-a);return{kind:'roman',sub:'add',a,b,sym:'+',ans:a+b,roman:toRoman(a+b),k:'radd:'+a+'+'+b};}
    if(r<.9){const a=TP.rnd(2,20),b=TP.rnd(1,a-1);return{kind:'roman',sub:'sub',a,b,sym:'−',ans:a-b,roman:toRoman(a-b),k:'rsub:'+a+'-'+b};}
    const n=TP.rnd(1,20);return{kind:'roman',sub:'conv',a:n,ans:n,roman:toRoman(n),k:'rconv:'+n};
  },
  speedSVG:it=>it.kind==='tally'?tallySVG(it.a,it.b):(it.sub==='conv'?convSVG(it.a):romanSVG(it.a,it.sym,it.b))
};
})();
