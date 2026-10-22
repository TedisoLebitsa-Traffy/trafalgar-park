// Loads data/*.js into a fake browser global so Node can inspect them.
const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function(files){
  const ctx={window:{}};ctx.window=ctx;vm.createContext(ctx);
  (files||fs.readdirSync(path.join(__dirname,'../data')).filter(f=>f.endsWith('.js'))).forEach(f=>{
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../data',f),'utf8'),ctx,{filename:f});
  });
  return ctx.TPData;
};
