// Run after the manifest/cache builders: node tests/check_pictures.js
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('assets/pictures/manifest.json'),illustrations=read('data/picture_illustrations.json');
const sources=read('assets/pictures/sources.json'),credited=new Map(sources.map(r=>[r.file,r]));
const precache=new Set(read('precache.json').files);
const expected=['Anime Shows','Cartoon Shows','Kids Cartoons','Anime Characters','Movies','Superheroes','Cartoon Characters','Animated Movies','Movie Characters','Movie Villains','TV Shows','Video Games','Video Game Characters','Disney Characters','Pixar Characters','Fictional Creatures','Current Footballers','Retired Footballers','Athletes'];
for(const cat of expected)assert(manifest[cat]?.length>=6,cat+' must have a playable deck');
assert(!Object.keys(manifest).some(c=>/placeholder|emoji/i.test(c)),'No test or emoji categories');
let clues=0,atlasCells=0;
for(const [cat,items] of Object.entries(manifest)){
 const keys=new Set();
 for(const it of items){
  clues++;assert(it.answer?.trim(),cat+': answer required');
  const key=it.file||it.atlas+':'+it.cell;assert(!keys.has(key),cat+': duplicate clue');keys.add(key);
  const rel=it.atlas?'assets/clue-atlases/'+it.atlas:'assets/pictures/'+cat+'/'+it.file;
  assert(fs.existsSync(path.join(root,rel)),'Missing '+rel);assert(precache.has(rel),'Not available offline: '+rel);
  if(it.atlas){
   atlasCells++;assert(Number.isInteger(it.cell)&&it.cell>=0&&it.cell<6,'Bad atlas cell');
   const png=fs.readFileSync(path.join(root,rel));assert.equal(png.subarray(1,4).toString(),'PNG');
   assert.equal(png.readUInt32BE(16)%3,0,'Atlas must have 3 equal columns');assert.equal(png.readUInt32BE(20)%2,0,'Atlas must have 2 equal rows');
   assert(illustrations[cat].some(x=>x.atlas===it.atlas&&x.cell===it.cell&&x.answer===it.answer),'Illustration source mismatch');
  }else if(cat!=='Chemical Symbols'){
   const credit=credited.get(cat+'/'+it.file);assert(credit,'Missing credit: '+rel);assert(credit.source?.startsWith('https://commons.wikimedia.org/wiki/File:')&&credit.license&&credit.artist,'Incomplete attribution: '+rel);
  }
 }
}
assert(clues>=314,'Expected complete picture library');assert(Object.keys(manifest).length>=34,'Expected all picture categories');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert(sw.includes(read('precache.json').version),'Offline version mismatch');
console.log('PASS: '+clues+' clues across '+Object.keys(manifest).length+' picture categories; '+atlasCells+' atlas clues; all assets credited and precached.');
