/* TRIVIA - kept in the code but hidden from the hub (App.cmd('open','trivia') from the console brings it back). */
(function(){
const TP=window.TP,App=window.App,H=TP.H,esc=TP.esc;
const deck=new TP.Deck(TPData.trivia.items,'dTr',q=>q[1]);
let S=null;
const G={
  id:'trivia',name:'Trivia',icon:'🧠',desc:'Quick-fire questions',hidden:true,
  open(){S={n:0,cur:null,shown:false,names:['Team 1','Team 2'],sc:[0,0]};},
  active:()=>S&&S.n>0,resumable:()=>false,
  save(){return{S};},load(o){S=o.S;},
  cmd(name,arg){
    switch(name){
      case'next':case'toggle':S.cur=deck.draw();S.n++;S.shown=false;break;
      case'reveal':case'correct':if(S.cur){S.shown=true;App.sfx('ok');}break;
      case'adj':{const [i,d]=arg.split(':');S.sc[+i]+=+d;break;}
      default:return false;
    }
  },
  view(){
    return{kind:'scene',top:{title:'🧠 Trivia',text:'Question '+S.n},
      blocks:S.cur?[{t:'chip',x:S.cur[0]},{t:'text',cls:'q',x:S.cur[1]},{t:'text',cls:'ans',x:S.shown?S.cur[2]:''}]:[{t:'text',cls:'q',x:'Press Next Question'}],
      btns:[{cmd:'reveal',label:'Reveal answer',cls:'sky'},{cmd:'next',label:'Next question →',cls:'',key:'N'}],
      board:S.names.map((n,i)=>({name:n,score:S.sc[i],n:S.sc[i]}))};
  },
  host(){
    return H.sec('Question',(S.cur?H.ans('Answer',S.cur[2],S.cur[0]):'')+H.row(H.btn('Reveal','reveal',undefined,'sky')+H.btn('Next question','next',undefined,''))+
      S.names.map((n,i)=>H.row('<b style="min-width:8em">'+esc(n)+'</b> '+S.sc[i]+H.btn('−1','adj',i+':-1','ghost')+H.btn('+1','adj',i+':1','ghost'))).join(''));
  }
};
App.register(G);
})();
