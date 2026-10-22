/* FINISH THE PROVERB - duel format. Display shows the first half of a famous proverb (or Bible verse); admin shows the whole thing;
   the host judges whether the player finished it correctly.
   Level "Easy" (default) uses only the very best-known sayings (TPData.proverbs.easy); "All" adds the harder / international ones.
   Incorrect REVEALS the correct ending on the display (and locks the item); press Skip / Next for a new one. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const items=TPData.proverbs.items.map(p=>({k:(p[0]+' '+p[1]).toLowerCase(),s:p[0],e:p[1],o:p[2],r:p[3]||''}));
const easySet=new Set(TPData.proverbs.easy.map(s=>s.toLowerCase()));
const easyItems=items.filter(p=>easySet.has(p.s.toLowerCase()));
TP.proverbEasyCount=easyItems.length;
const decks={all:new TP.Deck(items,'dProv',p=>p.k),easy:new TP.Deck(easyItems,'dProvEasy',p=>p.k)};
const cfg={
  id:'proverb',name:'Finish the Proverb',icon:'📜',desc:'Complete the saying',
  rules:'The first half of a proverb (or a Bible verse – never from the Book of Proverbs) is shown. The player finishes it. Correct passes the turn. Incorrect shows the right answer on screen – then press Skip / Next for a new one. Easy = only very well-known sayings.',
  incorrectLocks:true,
  opts:()=>({level:'easy'}),
  setupHost(S){
    const l=S.opts.level;
    return H.sec('Level','<div class="chipsel"><button class="chip '+(l==='easy'?'sel':'')+'" data-cmd="level" data-arg="easy">😊 Easy – very well-known ('+easyItems.length+')</button><button class="chip '+(l==='all'?'sel':'')+'" data-cmd="level" data-arg="all">🎓 All – includes harder & international ('+items.length+')</button></div>');
  },
  setupCmd(S,name,arg){if(name==='level'){S.opts.level=arg==='all'?'all':'easy';return;}return false;},
  draw(S){return decks[S.opts.level==='all'?'all':'easy'].draw();},
  lastText(it,ok){return'';},
  clue(it,ctx){
    const L=it.s.length,fs=L<36?3.6:(L<62?2.8:2.3),E=it.e.length,as=E<50?3:(E<85?2.3:1.8);
    const b=[{t:'chip',x:it.o==='Scripture'?'📖 Scripture':it.o+' proverb'},{t:'text',cls:'q',blur:1,style:'font-size:'+fs+'em',x:it.s+' …'}];
    if(ctx.shown)b.push({t:'text',cls:'ans',style:'font-size:'+as+'em',x:'… '+it.e});
    return b;
  },
  answer(it){return{label:it.o==='Scripture'?'Full verse':'Full proverb',val:it.s+' '+it.e,sub:it.o==='Scripture'?'Scripture – '+it.r:it.o};}
};
App.register(TP.makeDuel(cfg));
})();
