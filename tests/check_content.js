// Content quality checks: node tests/check_content.js
const D=require('./load.js')();
let bad=0;const fail=m=>{bad++;console.log('  ✗ '+m);};const ok=m=>console.log('  ✓ '+m);
const low=s=>String(s).toLowerCase().trim();
function dupes(a,k){const s=new Set(),d=[];a.forEach(x=>{const v=low(k?k(x):x);if(s.has(v))d.push(v);s.add(v);});return d;}
function count(name,n,min,dups){ (n>=min&&!dups.length)?ok(name+': '+n+' (min '+min+')'):fail(name+': '+n+' (min '+min+') dups='+dups.join('|')); }

console.log('30 Seconds');
count('words',D.words30.items.length,400,dupes(D.words30.items));

console.log('Taboo');
const SYN=[['football','soccer'],['car','automobile'],['tv','television'],['cellphone','phone','smartphone','mobile'],['vacation','holiday'],['movie','film','cinema'],['doctor','physician'],['prison','jail'],['rubbish','trash','garbage'],['sofa','couch'],['cop','police'],['bike','bicycle'],['lift','elevator'],['biscuit','cookie'],['sweets','candy'],['fireman','firefighter'],['pilot','aviator']];
const tn=D.taboo.normal.map(c=>c[0]),th=D.taboo.hard.map(c=>c[0]);
count('normal',tn.length,150,dupes(tn));count('hard',th.length,150,dupes(th));
const all=new Set(tn.concat(th).map(low));
const allDup=dupes(tn.concat(th));if(allDup.length)fail('cards in both pools: '+allDup.join('|'));else ok('no card appears in both pools');
D.taboo.normal.forEach(c=>{if(c.length!==4)fail('normal needs 3 forbidden: '+c[0]);});
D.taboo.hard.forEach(c=>{if(c.length!==5)fail('hard needs 4 forbidden: '+c[0]);});
[...D.taboo.normal,...D.taboo.hard].forEach(c=>{
  const t=low(c[0]),fs=c.slice(1).map(low);
  if(new Set(fs).size!==fs.length)fail('repeated forbidden word in '+c[0]);
  fs.forEach(f=>{
    if(f===t||f.includes(t)||t.includes(f)&&f.length>3&&t.split(' ').includes(f))fail(c[0]+' forbids itself/part: '+f);
    if(all.has(f))fail(c[0]+' forbids "'+f+'" which is itself a card');
  });
});
SYN.forEach(g=>{const hit=g.filter(w=>all.has(w));if(hit.length>1)fail('synonym cards: '+hit.join(' & '));});
const forbSyn=[];[...D.taboo.normal,...D.taboo.hard].forEach(c=>{SYN.forEach(g=>{if(g.includes(low(c[0]))){c.slice(1).forEach(f=>{if(g.includes(low(f)))forbSyn.push(c[0]+'→'+f);});}});});
forbSyn.length?fail('synonym forbidden: '+forbSyn.join(', ')):ok('no synonym of a card is forbidden on it');

console.log('Imposter');
count('pairs',D.imposter.length,150,dupes(D.imposter,p=>p[0]+'|'+p[1]));
const rev=dupes(D.imposter.map(p=>[p[0],p[1]].sort().join('|')));rev.length?fail('reversed duplicate pairs: '+rev.join(', ')):ok('no reversed duplicate pairs');
D.imposter.forEach(p=>{if(low(p[0])===low(p[1]))fail('pair identical '+p[0]);});

console.log('Emoji meaning');
count('emoji',D.emoji.items.length,150,dupes(D.emoji.items,p=>p[1]));
const ek=dupes(D.emoji.items,p=>p[0]);ek.length?fail('duplicate emoji strings: '+ek.join(' ')):ok('no duplicate emoji strings');

console.log('Bible books');
const BOOKS="Genesis,Exodus,Leviticus,Numbers,Deuteronomy,Joshua,Judges,Ruth,1 Samuel,2 Samuel,1 Kings,2 Kings,1 Chronicles,2 Chronicles,Ezra,Nehemiah,Esther,Job,Psalms,Proverbs,Ecclesiastes,Song of Solomon,Isaiah,Jeremiah,Lamentations,Ezekiel,Daniel,Hosea,Joel,Amos,Obadiah,Jonah,Micah,Nahum,Habakkuk,Zephaniah,Haggai,Zechariah,Malachi,Matthew,Mark,Luke,John,Acts,Romans,1 Corinthians,2 Corinthians,Galatians,Ephesians,Philippians,Colossians,1 Thessalonians,2 Thessalonians,1 Timothy,2 Timothy,Titus,Philemon,Hebrews,James,1 Peter,2 Peter,1 John,2 John,3 John,Jude,Revelation".split(',');
const have=new Set(D.bible.items.map(i=>i[1]));
const miss=BOOKS.filter(b=>!have.has(b));
BOOKS.length===66?ok('66 books in the checklist'):fail('checklist is '+BOOKS.length);
miss.length?fail('missing books: '+miss.join(', ')):ok('all 66 books covered');
count('bible clues',D.bible.items.length,66,dupes(D.bible.items,p=>p[0]));

console.log('Cartoons / Proverbs / Higher-Lower');
count('cartoon clues',D.cartoons.items.length,100,dupes(D.cartoons.items,p=>p[0]));
count('proverbs',D.proverbs.items.length,150,dupes(D.proverbs.items,p=>p[0]+' '+p[1]));
const sc=D.proverbs.items.filter(p=>p[2]==='Scripture');sc.length>=60?ok('scripture verses: '+sc.length):fail('scripture verses only '+sc.length);
sc.some(p=>/Proverbs/.test(p[3]))?fail('a Book of Proverbs verse slipped in'):ok('no verses from the Book of Proverbs');
const pOrig={};D.proverbs.items.forEach(p=>pOrig[p[2]]=(pOrig[p[2]]||0)+1);console.log('    origins:',JSON.stringify(pOrig));
let pairs=0;D.hol.sets.forEach(s=>{
  const nm=new Set();s.items.forEach(i=>{if(nm.has(i[0]))fail('duplicate HoL item '+i[0]);nm.add(i[0]);});
  const num=s.items.filter(i=>typeof i[1]==='number');
  for(let i=0;i<num.length;i++)for(let j=i+1;j<num.length;j++){const a=num[i][1],b=num[j][1],d=Math.abs(a-b),m=Math.max(a,b);if(a!==b&&(s.minDiff!==undefined?d>=s.minDiff:d/m>=(s.gap||.07)))pairs++;}
  if(!num.length)pairs+=s.items.length*(s.items.length-1)/4;   // age sets (computed at runtime): rough lower bound
});
pairs>=150?ok('higher/lower pairs >= '+pairs+' (min 150)'):fail('only '+pairs+' pairs');

console.log(bad?('\n'+bad+' problem(s)'):'\nAll content checks passed');
process.exit(bad?1:0);
