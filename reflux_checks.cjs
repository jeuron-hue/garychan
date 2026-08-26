// Static checker for reflux.html
const fs=require('fs'),{execSync}=require('child_process'),os=require('os'),path=require('path');
const FILE=process.argv[2]||'reflux.html';
const s=fs.readFileSync(FILE,'utf8');
let fails=[]; const chk=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m); if(!c)fails.push(m);};
const head=s.split('-->')[0];              // build-notes header
const doc=s.slice(head.length);            // everything the browser acts on

// 1. residue: no prior-employer or prior-tool strings anywhere, incl. header
for(const t of ['kaneka','KSC','Technical Development','gary.chan@','TD Calc','tdcalc'])
  chk(!new RegExp(t,'i').test(s),'no residue: '+t);
chk(!/IPCal/.test(s),'no residue: IPCal (lowercase tab key "ipcal" is an internal id and allowed)');
chk(!/[\u200b-\u200f\u202a-\u202e\ufeff]/.test(s),'no invisible/bidi control characters');
chk((doc.match(/jeuron@gmail\.com/g)||[]).length===2,'contact address on both bug links');
chk(!/JetBrains|'Inter'/.test(doc),'dropped typefaces not referenced');
chk(!/service_role|eyJ[A-Za-z0-9_-]{20,}/.test(s),'no key-shaped strings');

// 2. document structure
chk((doc.match(/<html/g)||[]).length===0&&/^<html lang="en" data-theme="light">/m.test(s),'one html element, light default');
chk((doc.match(/<body/g)||[]).length===1,'one body');
chk((doc.match(/<style>/g)||[]).length===1,'one style block');
const scripts=[...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
chk(scripts.length===2,'two inline scripts (got '+scripts.length+')');

// 3. both scripts parse as real JS (node, not brace counting)
scripts.forEach((js,i)=>{
  const f=path.join(os.tmpdir(),'chk'+i+'.js'); fs.writeFileSync(f,js);
  let ok=true; try{execSync('node --check '+f,{stdio:'pipe'});}catch(e){ok=false;}
  chk(ok,'script '+(i+1)+' parses');
});
chk(/^\s*\(function \(\)/.test(scripts[1])&&/\}\)\(\);\s*$/.test(scripts[1]),'profiler script isolated in an IIFE');

// 4. tabs wired consistently
const btns=[...doc.matchAll(/switchTab\('([a-z]+)'\)/g)].map(m=>m[1]);
const arr=doc.match(/const TABS=\[(.*?)\];/)[1].split(',').map(x=>x.trim().replace(/"/g,''));
chk(JSON.stringify(btns)===JSON.stringify(arr),'tab button order matches TABS');
arr.forEach(t=>chk((doc.match(new RegExp('id="panel-'+t+'"','g'))||[]).length===1,'panel-'+t+' declared once'));

// 5. profiler CSS fully scoped, no leakage
const css=doc.match(/IMPURITY PROFILE \(scoped\) ={4,} \*\/\n([\s\S]*?)\n<\/style>/)[1];
const sels=[...css.matchAll(/^([^{}\n]+)\{/gm)].map(m=>m[1].trim());
chk(sels.length>0&&sels.every(x=>x.includes('#panel-ipcal')),'every profiler selector scoped to #panel-ipcal');
chk(!/:root/.test(css),'profiler declares no :root variables');
for(const v of ['--accent','--accent-dim','--bg-card','--bg-input','--border','--text-muted'])
  chk(new RegExp('#panel-ipcal[^{]*\\{[^}]*'+v+'\\s*:').test(css.replace(/\n/g,'')),'colliding var '+v+' redeclared inside scope');

// 6. ids unique, static lookups resolve, dynamic lookups null-guarded
const ids=[...doc.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
chk(new Set(ids).size===ids.length,'element ids unique');
const looked=[...doc.matchAll(/getElementById\(['"]([A-Za-z][\w-]*)['"]\)/g)].map(m=>m[1]);
const dyn=[...doc.matchAll(/\.id\s*=\s*['"]([\w-]+)['"]/g)].map(m=>m[1]);
const missing=[...new Set(looked)].filter(x=>!ids.includes(x)&&!dyn.includes(x));
chk(missing.length===0,'all getElementById targets are declared or built at runtime (missing: '+missing+')');

// 7. one theme engine, one key
chk(!/applyTheme|ipcal-theme|tdcalc-theme/.test(doc),'no second theme engine or storage key');
chk((doc.match(/reflux-theme/g)||[]).length===2,'single theme key, read and write');
chk((doc.match(/class="theme-toggle"/g)||[]).length===1,'one theme toggle control');

// 8. inline handlers resolve
const h=new Set([...doc.matchAll(/on(?:click|change|input|keyup|blur)="([A-Za-z_$][\w$]*)\(/g)].map(m=>m[1]));
const def=new Set([...doc.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
chk([...h].every(x=>def.has(x)),'inline handlers all defined');

console.log('\n'+(fails.length?fails.length+' FAILURES':'ALL GREEN'));
process.exit(fails.length?1:0);
