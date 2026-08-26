// Static checker for reflux.html
const fs=require('fs'),{execSync}=require('child_process'),os=require('os'),path=require('path'),crypto=require('crypto');
const FILE=process.argv[2]||'reflux.html';
const s=fs.readFileSync(FILE,'utf8');
let fails=[]; const chk=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m); if(!c)fails.push(m);};
const head=s.split('-->')[0];              // build-notes header
const doc=s.slice(head.length);            // everything the browser acts on

// Vendored engine blocks are carved out before any structural scan. They are
// 2.7MB of minified third-party code containing HTML-shaped substrings
// ("<html", "<body", "<script>" inside error-message strings) which would
// otherwise be read as this document's own markup.
const region=(open,tag)=>{const i=doc.indexOf(open); if(i<0)return null;
  const st=i+open.length, en=doc.indexOf('</'+tag+'>',st);
  return {open:i,start:st,end:en,body:doc.slice(st,en)};};
const VEND=[['<script id="chem-lib-raphael">','script'],['<script id="chem-lib-kekule">','script'],
            ['<style id="chem-theme-css">','style']].map(([o,t])=>region(o,t));
chk(VEND.every(Boolean),'all three vendored engine blocks present');
const app=VEND.filter(Boolean).sort((a,b)=>b.open-a.open)
  .reduce((acc,r)=>acc.slice(0,r.start)+acc.slice(r.end),doc);   // markup minus vendored payloads
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');

// 1. residue: no prior-employer or prior-tool strings anywhere, incl. header
for(const t of ['kaneka','KSC','Technical Development','gary.chan@','TD Calc','tdcalc','ChemSketch'])
  chk(!new RegExp(t,'i').test(s),'no residue: '+t);
chk(!/IPCal/.test(s),'no residue: IPCal (lowercase tab key "ipcal" is an internal id and allowed)');
chk(!/[\u200b-\u200f\u202a-\u202e\ufeff]/.test(s),'no invisible/bidi control characters');
chk((app.match(/jeuron@gmail\.com/g)||[]).length===2,'contact address on both bug links');
chk(!/JetBrains|'Inter'/.test(app),'dropped typefaces not referenced');
chk(!/service_role|eyJ[A-Za-z0-9_-]{20,}/.test(s),'no key-shaped strings');

// 2. document structure
chk((app.match(/<html/g)||[]).length===0&&/^<html lang="en" data-theme="light">/m.test(s),'one html element, light default');
chk((app.match(/<body/g)||[]).length===1,'one body');
chk((app.match(/<style>/g)||[]).length===1,'one unnamed style block (the shell sheet)');
chk((app.match(/<style id="chem-css">/g)||[]).length===1,'one scoped structure-editor style block');
const scripts=[...app.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
chk(scripts.length===2,'two unnamed inline scripts (got '+scripts.length+')');
const chemApp=(app.match(/<script id="chem-app">([\s\S]*?)<\/script>/)||[])[1];
chk(!!chemApp,'structure-editor app script present');
const tagCount=re=>(app.match(re)||[]).length;
chk(tagCount(/<script src="https:\/\/[^"]+"><\/script>/g)===3,'three CDN script tags');
chk(tagCount(/<script id="chem-lib-[a-z]+">/g)===2,'two vendored engine script tags');
chk(tagCount(/<script[ >]/g)===8,'script tag census: 3 CDN + 2 unnamed + 1 chem-app + 2 vendored (got '+tagCount(/<script[ >]/g)+')');

// 3. authored scripts parse as real JS (node, not brace counting)
[...scripts,chemApp].forEach((js,i)=>{
  if(js==null) return;
  const f=path.join(os.tmpdir(),'chk'+i+'.js'); fs.writeFileSync(f,js);
  let ok=true; try{execSync('node --check '+f,{stdio:'pipe'});}catch(e){ok=false;}
  chk(ok,'authored script '+(i+1)+' parses');
});
chk(/^\s*\(function \(\)/.test(scripts[1])&&/\}\)\(\);\s*$/.test(scripts[1]),'profiler script isolated in an IIFE');
chk(/^\s*\(function\(\)/.test(chemApp||'')&&/\}\)\(\);\s*$/.test(chemApp||''),'structure-editor script isolated in an IIFE');
chk(!/window\.kscChemSketch/.test(s)&&/window\.refluxChem\s*=/.test(chemApp||''),'branded global replaced by window.refluxChem');

// 4. vendored engine integrity. The tool this came from had a build step that
//    fetched and inlined these; the build is gone, so its guarantees live here.
const PIN=Object.fromEntries([...head.matchAll(/sha256 ([0-9a-f]{64})/g)].map((m,i)=>[i,m[1]]));
chk(Object.keys(PIN).length===3,'three payload fingerprints pinned in the header');
const named=[['kekule',/Kekule\.js\s+1\.0\.4\s+sha256 ([0-9a-f]{64})/],['raphael',/Raphael\s+2\.3\.0\s+sha256 ([0-9a-f]{64})/],
             ['theme',/theme CSS\s+sha256 ([0-9a-f]{64})/]];
const pin=Object.fromEntries(named.map(([k,re])=>[k,(head.match(re)||[])[1]]));
chk(!!pin.kekule&&!!pin.raphael&&!!pin.theme,'engine versions and fingerprints readable from the header');
if(VEND.every(Boolean)){
  chk(sha(VEND[0].body)===pin.raphael,'raphael payload matches its pinned fingerprint');
  chk(sha(VEND[1].body)===pin.kekule,'kekule payload matches its pinned fingerprint');
  chk(sha(VEND[2].body)===pin.theme,'engine theme CSS matches its pinned fingerprint');
  chk(!/<\/script/i.test(VEND[0].body)&&!/<\/script/i.test(VEND[1].body),'no </script inside a vendored script block');
  chk(!/<\/style/i.test(VEND[2].body),'no </style inside the vendored style block');
}

// 5. header version and the version the page renders agree
const hv=(head.match(/Reflux (v\d+) - Process Chemistry Toolbox/)||[])[1];
const pv=(app.match(/APP_VER="(v\d+)"/)||[])[1];
chk(!!hv&&hv===pv,'header version matches the rendered APP_VER ('+hv+' vs '+pv+')');

// 6. tabs wired consistently
const bar=(app.match(/<div class="tab-bar">([\s\S]*?)<\/div>/)||[])[1]||'';
const btns=[...bar.matchAll(/switchTab\('([a-z]+)'\)/g)].map(m=>m[1]);
const arr=app.match(/const TABS=\[(.*?)\];/)[1].split(',').map(x=>x.trim().replace(/"/g,''));
chk(JSON.stringify(btns)===JSON.stringify(arr),'tab button order matches TABS');
chk(arr.length===8,'eight tabs (got '+arr.length+')');
arr.forEach(t=>chk((app.match(new RegExp('id="panel-'+t+'"','g'))||[]).length===1,'panel-'+t+' declared once'));

// deep links: index.html points at individual tools via the URL hash
chk(/window\.addEventListener\("hashchange"/.test(app),'hash routing wired to hashchange');
chk(/TABS\.indexOf\(h\)/.test(app),'hash validated against TABS before it reaches switchTab');
chk(/history\.replaceState/.test(app),'tab switch keeps the URL hash in step');

// splash page links resolve to real tabs. A renamed tab must not silently
// orphan a card on index.html, so the two files are checked against each other.
const SPLASH=path.join(path.dirname(path.resolve(FILE)),'index.html');
if(fs.existsSync(SPLASH)){
  const idxRaw=fs.readFileSync(SPLASH,'utf8');
  const idx=idxRaw.slice(idxRaw.split('-->')[0].length);   // drop its build-notes header, as above
  const links=[...idx.matchAll(/href="reflux\.html#([a-z]+)"/g)].map(m=>m[1]);
  chk(links.length===arr.length,'splash has one deep link per tab (got '+links.length+' for '+arr.length+' tabs)');
  const bad=links.filter(x=>!arr.includes(x));
  chk(bad.length===0,'every splash deep link targets a real tab (bad: '+bad+')');
  chk(JSON.stringify(links)===JSON.stringify(arr),'splash card order matches tab order');
  chk(!/kaneka|KSC|ChemSketch/i.test(idxRaw),'no employer or prior product string on the splash page');
  chk(!/[\u200b-\u200f\u202a-\u202e\ufeff]/.test(idxRaw),'no invisible/bidi characters on the splash page');
  chk((idx.match(/reflux-theme/g)||[]).length===2,'splash shares the single theme key, read and write');
  chk(/href="reflux\.html"/.test(idx),'splash offers a plain link to the toolbox');
  chk(!/on(?:click|change|input)="/.test(idx),'splash binds no inline handlers');
}else{
  chk(false,'index.html splash page present');
}

// 7. profiler CSS fully scoped, no leakage
const css=app.match(/IMPURITY PROFILE \(scoped\) ={4,} \*\/\n([\s\S]*?)\n<\/style>/)[1];
const sels=[...css.matchAll(/^([^{}\n]+)\{/gm)].map(m=>m[1].trim());
chk(sels.length>0&&sels.every(x=>x.includes('#panel-ipcal')),'every profiler selector scoped to #panel-ipcal');
chk(!/:root/.test(css),'profiler declares no :root variables');
for(const v of ['--accent','--accent-dim','--bg-card','--bg-input','--border','--text-muted'])
  chk(new RegExp('#panel-ipcal[^{]*\\{[^}]*'+v+'\\s*:').test(css.replace(/\n/g,'')),'colliding var '+v+' redeclared inside scope');

// 8. structure-editor CSS fully scoped, no leakage
// Selectors are pulled with a brace walker rather than a line regex, because the
// engine sheet is one long line and nests rules inside @supports.
const selectorsOf=t=>{const out=[];let d=0,buf='',i=0;
  while(i<t.length){const c=t[i];
    if(c==='/'&&t[i+1]==='*'){const e=t.indexOf('*/',i+2);i=e<0?t.length:e+2;continue;}
    if(c==='"'||c==="'"){let j=i+1;while(j<t.length&&t[j]!==c){if(t[j]==='\\')j++;j++;}i=j+1;continue;}
    if(c==='{'){const p=buf.trim();if(p&&!p.startsWith('@'))out.push(...p.split(',').map(x=>x.trim()));buf='';d++;i++;continue;}
    if(c==='}'){buf='';d--;i++;continue;}
    buf+=c;i++;}
  return out.filter(Boolean);};
const chemCss=(app.match(/<style id="chem-css">([\s\S]*?)<\/style>/)||[])[1]||'';
const chemCode=chemCss.replace(/\/\*[\s\S]*?\*\//g,'');   // rules only; comments explain the scoping
const chemSels=selectorsOf(chemCss);
chk(chemSels.length>0&&chemSels.every(x=>x.startsWith('#panel-chem')),'every structure-editor selector scoped to #panel-chem');
chk(!/:root/.test(chemCode),'structure-editor declares no :root variables');
const chemVars=[...new Set([...chemCode.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m=>m[1]))];
chk(chemVars.length>0&&chemVars.every(v=>v.startsWith('--chem-')),
    'structure-editor custom properties all --chem- prefixed (got '+chemVars.join(',')+')');
for(const v of ['--bg','--border','--text','--accent'])
  chk(!new RegExp('(^|[;{\\s])'+v+'\\s*:').test(chemCode),'colliding var '+v+' not redeclared by the structure editor');
if(VEND[2]){
  const engSels=selectorsOf(VEND[2].body);
  const loose=engSels.filter(x=>!x.startsWith('#panel-chem'));
  // Exactly one selector stays global. The engine detects whether its own
  // stylesheet loaded by injecting this span into document.body and reading its
  // computed z-index; scoping it fails that probe and makes the engine inject an
  // @import for an external theme file, which would break the offline guarantee.
  chk(loose.length===1&&loose[0]==='span.K-StyleSheet-Detector',
      'engine sheet scoped to #panel-chem with exactly one documented exemption (got '+JSON.stringify(loose.slice(0,4))+')');
  chk(engSels.length>900,'engine sheet selectors actually walked ('+engSels.length+')');
  chk(!/K-Res-Icon-Color-NotSet/.test(VEND[2].body),'dead colour-swatch rule removed from the engine sheet');
}

// 9. ids unique, static lookups resolve, dynamic lookups null-guarded
const ids=[...app.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
chk(new Set(ids).size===ids.length,'element ids unique');
const looked=[...app.matchAll(/getElementById\(['"]([A-Za-z][\w-]*)['"]\)/g)].map(m=>m[1]);
const dyn=[...app.matchAll(/\.id\s*=\s*['"]([\w-]+)['"]/g)].map(m=>m[1]);
const missing=[...new Set(looked)].filter(x=>!ids.includes(x)&&!dyn.includes(x));
chk(missing.length===0,'all getElementById targets are declared or built at runtime (missing: '+missing+')');

// 10. one theme engine, one key
chk(!/applyTheme|ipcal-theme|tdcalc-theme|chem-theme"/.test(app),'no second theme engine or storage key');
chk((app.match(/reflux-theme/g)||[]).length===2,'single theme key, read and write');
chk((app.match(/class="theme-toggle"/g)||[]).length===1,'one theme toggle control');

// 11. inline handlers resolve
const h=new Set([...app.matchAll(/on(?:click|change|input|keyup|blur)="([A-Za-z_$][\w$]*)\(/g)].map(m=>m[1]));
const def=new Set([...app.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
chk([...h].every(x=>def.has(x)),'inline handlers all defined');
chk(!/on(?:click|change|input|keyup|blur)="/.test(app.match(/id="panel-chem"[\s\S]*?\n  <\/div>/)?.[0]||''),
    'structure-editor panel binds no inline handlers');

console.log('\n'+(fails.length?fails.length+' FAILURES':'ALL GREEN'));
process.exit(fails.length?1:0);
