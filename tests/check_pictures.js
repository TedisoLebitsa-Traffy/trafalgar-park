// Run after rebuilding manifest and precache.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('assets/pictures/manifest.json'),precache=new Set(read('precache.json').files);
const credits=new Map(read('assets/pictures/sources.json').map(r=>['assets/pictures/'+r.file,r]));
for(const r of read('assets/clue-photos/sources.json'))credits.set('assets/clue-photos/'+r.file,r);
const expected=['Throwback Music & Youth TV',"Old SA Kids' Shows",'Classic SA Sitcoms & Comedy','Classic Soapies','Classic International TV','Classic Action Movies','Childhood Movies','Old-school Cartoons','Childhood TV Favourites','Throwback Presenters & Actors'];
for(const cat of expected)assert(manifest[cat],cat+' missing');
assert(!Object.keys(manifest).some(c=>/placeholder|emoji/i.test(c)));
let count=0;const files=new Set();
for(const [cat,items] of Object.entries(manifest)){
 assert(items.length>=30,cat+' must have at least 30 clues');const keys=new Set(),questions=new Set();
 for(const it of items){
  count++;assert(it.answer?.trim(),cat+': missing answer');const key=it.id||it.file||it.atlas+':'+it.cell;
  assert(!keys.has(key),cat+': duplicate key '+key);keys.add(key);
  const rel=it.media||(it.atlas?'assets/clue-atlases/'+it.atlas:'assets/pictures/'+cat+'/'+it.file);
  assert(fs.existsSync(path.join(root,rel)),'Missing '+rel);assert(precache.has(rel),'Not cached '+rel);files.add(rel);
  if(it.question){assert(it.source?.startsWith('https://'),cat+': missing factual reference');const q=(it.answer+'|'+it.question).toLowerCase();assert(!questions.has(q),'Duplicate question '+q);questions.add(q);}
  if(it.atlas){assert(Number.isInteger(it.cell)&&it.cell>=0&&it.cell<6);const png=fs.readFileSync(path.join(root,rel));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16)%3,0);assert.equal(png.readUInt32BE(20)%2,0);}
  else if(!rel.startsWith('assets/clue-symbols/')&&!rel.startsWith('assets/pictures/Chemical Symbols/')){
   const c=credits.get(rel);assert(c,'Missing credit '+rel);assert(c.source?.startsWith('https://commons.wikimedia.org/wiki/File:')&&c.license,'Incomplete licensing '+rel);
  }
 }
}
assert(count>=1320);assert.equal(Object.keys(manifest).length,44);
assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(read('precache.json').version));
console.log(`PASS: ${count} clues, 44 picture categories, each >=30; ${files.size} image assets exist, credited and cached.`);
