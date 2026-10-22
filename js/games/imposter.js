/* IMPOSTER - 3 to 8 players, pass-the-screen reveal.
   The secret roles are shown ONLY on the admin page (the host passes that screen around);
   the stream display only shows who is peeking, then the discussion timer, then the result. */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const deck=new TP.Deck(TPData.imposter,'dImp',p=>p[0]+'|'+p[1]);
const clock=new TP.Clock(180000);
let S=null,expiredHandled=false;

const impCountFor=(n,two)=>(n>=6&&two)?2:1;
function openState(){
  clock.pause();clock.set(180000);expiredHandled=false;
  S={phase:'setup',n:+App.memGet('imN',4),two:false,similar:false,f:App.memGet('imNames',[]),scores:[],game:null};
}
const names=()=>S.game.names;

const G={
  id:'imposter',name:'Imposter',icon:'🕵️',desc:'Find the odd one out',
  open:openState,
  active:()=>S&&S.phase!=='setup',
  resumable:s=>s&&s.phase!=='setup'&&s.phase!=='result',
  pause(){clock.pause();},
  field(n,v){
    if(n==='n'){S.n=Math.max(3,Math.min(8,+v||4));}
    else if(n==='two')S.two=!!v;
    else if(n==='similar')S.similar=!!v;
    else if(/^p\d$/.test(n))S.f[+n[1]]=v;
  },
  save(){return{S,ms:clock.left()};},
  load(o){S=o.S;clock.pause();clock.set(o.ms);expiredHandled=clock.left()<=0;},

  cmd(name,arg){
    const g=S.game;
    switch(S.phase){
    case'setup':
      if(name==='setn'){S.n=+arg;if(S.n<6)S.two=false;return;}
      if(name==='start'||name==='toggle'){
        const nm=[];for(let i=0;i<S.n;i++)nm.push(((S.f[i]||'')+'').trim()||'Player '+(i+1));
        App.memSet('imNames',S.f);App.memSet('imN',S.n);
        const pair=deck.draw(),flip=Math.random()<.5;
        const k=impCountFor(S.n,S.two),imps=TP.shuffle([...Array(S.n).keys()]).slice(0,k);
        S.game={names:nm,i:0,word:flip?pair[0]:pair[1],other:flip?pair[1]:pair[0],imps,first:TP.rnd(0,S.n-1),peek:false};
        if(S.scores.length!==S.n)S.scores=nm.map(()=>0);
        S.phase='pass';
      }
      return;
    case'pass':
      if(name==='peek'||name==='toggle'){g.peek=true;S.phase='reveal';App.sfx('tick');}
      return;
    case'reveal':
      if(name==='hidepass'||name==='toggle'||name==='next'){
        g.peek=false;g.i++;
        if(g.i<S.n)S.phase='pass';
        else{S.phase='discuss';clock.set(180000);expiredHandled=false;}
        App.sfx('ok');
      }
      return;
    case'discuss':
      if(name==='toggle'){if(clock.run)clock.pause();else clock.start();return;}
      if(name==='reveal'||name==='next'){clock.pause();S.phase='result';App.sfx('win');return;}
      return false;
    case'result':
      if(name==='again'||name==='toggle'){const f=S.f,n=S.n,two=S.two,sim=S.similar,sc=S.scores;openState();S.f=f;S.n=n;S.two=two;S.similar=sim;S.scores=sc;return;}
      if(name==='adj'){const [i,d]=arg.split(':');S.scores[+i]+=+d;return;}
      return false;
    }
  },
  tick(){
    if(!S||S.phase!=='discuss')return false;
    App.beep(clock,10);
    if(clock.run&&clock.done()&&!expiredHandled){expiredHandled=true;clock.pause();App.sfx('end');S.phase='result';return true;}
    return false;
  },

  view(){
    const top={title:'🕵️ Imposter'};
    if(S.phase==='setup')return{kind:'scene',top,blocks:[{t:'text',cls:'q',x:'3 to 8 players · secret Imposter(s).\nThe host is setting up the game…',br:1}]};
    const g=S.game,dots=g.names.map((n,i)=>({x:n,s:S.phase==='pass'||S.phase==='reveal'?(i<g.i?'done':(i===g.i?'now':'')):''}));
    const board=g.names.map((n,i)=>({name:n,score:S.scores[i]||0,n:S.scores[i]||0}));
    const imps=g.imps.length;
    if(S.phase==='pass'||S.phase==='reveal'){
      return{kind:'scene',top:Object.assign({},top,{text:'Player '+(g.i+1)+' of '+S.n}),
        blocks:[{t:'text',cls:'imp-big',x:g.names[g.i]},
          {t:'text',cls:'info',x:S.phase==='pass'?'🤫 Look at the secret screen when it is your turn – nobody else peeks!':'🤫 '+g.names[g.i]+' is secretly checking their role…'},
          {t:'dots',items:dots},{t:'lbl',x:imps+' Imposter'+(imps>1?'s':'')+' among '+S.n+' players'}],board,snapSub:'Player scores'};
    }
    if(S.phase==='discuss')return{kind:'scene',top:Object.assign({},top,{clock:clock.view({fmt:'mss',low:10}),text:'Discussion'}),
      blocks:[{t:'text',cls:'q',x:'Each player gives one clue, then discuss and vote!\n'+g.names[g.first]+' goes first.',br:1},{t:'lbl',x:imps+' Imposter'+(imps>1?'s':'')+' among '+S.n+' players'}],board,paused:!clock.run&&clock.left()>0&&clock.left()<180000,snapSub:'Player scores'};
    return{kind:'scene',top:Object.assign({},top,{text:'Result'}),
      blocks:[{t:'lbl',x:'The imposter'+(imps>1?'s were':' was')},{t:'text',cls:'imp-big imp-bad',x:g.imps.map(i=>g.names[i]).join(' & ')},
        {t:'lbl',x:'The secret word was'},{t:'text',cls:'imp-big imp-word',x:g.word}],
      btns:[{cmd:'again',label:'Play again',cls:'green'},{cmd:'hub',label:'Hub',cls:'ghost'}],board,snapSub:'Player scores'};
  },

  host(){
    if(S.phase==='setup'){
      let f='<div class="hgrid2">';for(let i=0;i<S.n;i++)f+=H.field('Player '+(i+1),'p'+i,S.f[i],'Player '+(i+1),18);f+='</div>';
      return H.sec('Players',
        '<div class="chipsel">'+[3,4,5,6,7,8].map(n=>'<button class="chip '+(S.n===n?'sel':'')+'" data-cmd="setn" data-arg="'+n+'">'+n+' players</button>').join('')+'</div>'+f+
        '<label class="fld"><span><input type="checkbox" name="two" '+(S.two?'checked ':'')+(S.n<6?'disabled ':'')+'> 2 imposters (available from 6 players; otherwise 1 imposter)</span></label>'+
        '<label class="fld"><span><input type="checkbox" name="similar" '+(S.similar?'checked ':'')+'> Imposter gets a <i>similar</i> word instead of "Imposter" (harder)</span></label>'+
        H.row(H.btn('Start game','start',undefined,'green',{form:1}))+
        H.note('Pass-the-screen: this admin screen is passed around so each player can secretly read their role. The stream display never shows the secret word until the final reveal.'));
    }
    const g=S.game;
    if(S.phase==='pass')return H.sec('Pass the screen to <b>'+esc(g.names[g.i])+'</b>',H.note('Player '+(g.i+1)+' of '+S.n+'. Make sure only this player is looking at THIS screen, not the stream.')+H.row(H.btn('👁 Tap to reveal my role','peek',undefined,'burg')));
    if(S.phase==='reveal'){
      const isImp=g.imps.includes(g.i);
      const secret=isImp?(S.similar?g.other:'🕵️ THE IMPOSTER'):g.word;
      return H.sec(esc(g.names[g.i])+', you are…',H.ans(isImp?'Blend in. Don\'t get caught!':'Describe it without saying it outright',secret,isImp&&S.similar?'You are the Imposter – this is a similar word, not the real one!':'')+
        H.row(H.btn(g.i+1<S.n?'Hide & pass along':'Hide & start discussion','hidepass',undefined,'sky')));
    }
    if(S.phase==='discuss')return H.sec('Discussion',H.note('First to speak: <b>'+esc(g.names[g.first])+'</b>. Imposter(s): <b>'+esc(g.imps.map(i=>g.names[i]).join(' & '))+'</b>. Word: <b>'+esc(g.word)+'</b>')+
      H.row(H.btn(clock.run?'⏸ Pause':'▶ Resume','toggle',undefined,'sky')+H.btn('Reveal imposter','reveal',undefined,'')));
    return H.sec('Result',H.row(H.btn('Play again','again',undefined,'green'))+'<p class="hnote">Scores:</p>'+g.names.map((n,i)=>H.row('<b style="min-width:8em">'+esc(n)+'</b> '+(S.scores[i]||0)+' '+H.btn('−1','adj',i+':-1','ghost')+H.btn('+1','adj',i+':1','ghost'))).join(''));
  }
};
App.register(G);
})();
