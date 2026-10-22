/* Bottle artwork for Bottle Blind - drawn as SVG (shared by display + admin). */
(function(){
const TP=window.TP=window.TP||{};
TP.BOTTLES=[
  {id:'blue',  name:'Blue',  fill:'#1F5FD6',cap:'#0B2F7A',shine:'#8DB5FF'},
  {id:'black', name:'Black', fill:'#1C1C22',cap:'#000000',shine:'#7B7B88'},
  {id:'red',   name:'Red',   fill:'#D32222',cap:'#7D0F0F',shine:'#FF9C9C'},
  {id:'green', name:'Green', fill:'#2C9A4B',cap:'#14562A',shine:'#9BE2AF'},
  {id:'yellow',name:'Yellow',fill:'#F4C400',cap:'#9A7B00',shine:'#FFF1A3'},
  {id:'white', name:'White', fill:'#FFFFFF',cap:'#9AA5B8',shine:'#E3EAF5'}
];
TP.bottleById=id=>TP.BOTTLES.find(b=>b.id===id);
TP.bottleSVG=function(id,cls){
  const b=TP.bottleById(id);if(!b)return'';
  return '<svg class="'+(cls||'')+'" viewBox="0 0 60 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+b.name+' bottle">'+
   '<rect x="22" y="2" width="16" height="12" rx="3" fill="'+b.cap+'" stroke="#0B1F4B" stroke-width="2"/>'+
   '<path d="M23 14 H37 V38 C37 48 54 54 54 74 V136 C54 143 50 147 44 147 H16 C10 147 6 143 6 136 V74 C6 54 23 48 23 38 Z" fill="'+b.fill+'" stroke="#0B1F4B" stroke-width="3" stroke-linejoin="round"/>'+
   '<rect x="6" y="84" width="48" height="32" fill="#fff" fill-opacity=".92" stroke="#0B1F4B" stroke-width="1.5"/>'+
   '<circle cx="30" cy="100" r="9" fill="'+b.fill+'" stroke="#0B1F4B" stroke-width="1.5"/>'+
   '<path d="M14 78 C14 66 18 60 24 54" stroke="'+b.shine+'" stroke-width="4" stroke-linecap="round" fill="none" opacity=".85"/>'+
   '</svg>';
};
})();
