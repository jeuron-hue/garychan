const fs=require('fs'), {JSDOM}=require('jsdom');
let fails=[];
const chk=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m); if(!c)fails.push(m);};

let html=fs.readFileSync(process.argv[2]||'reflux.html','utf8');
// strip CDN tags; stub the three libs so the page can boot offline
html=html.replace(/<script src="https:\/\/[^"]+"><\/script>/g,'');
// strip the vendored structure-editor engine for the same reason: it is 2.7MB
// of third-party code this suite does not test, and its composer needs a real
// canvas. Removing it also exercises the panel's engine-absent path.
html=html.replace(/<script id="chem-lib-[a-z]+">[\s\S]*?<\/script>/g,'');
html=html.replace(/<style id="chem-theme-css">[\s\S]*?<\/style>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',
  beforeParse(w){
    w.ExcelJS={}; w.XLSX={utils:{},writeFile(){}};
    w.math={evaluate:(e,s)=>Function('s','with(s){return '+e+'}')(s||{})};
    w.onerror=(m)=>errs.push(String(m));
    w.addEventListener('error',e=>errs.push(String(e.message)));
  }});
const {window}=dom, d=window.document;

chk(errs.length===0,'no uncaught errors on load ('+errs.slice(0,2)+')');

// panels
const panels=[...d.querySelectorAll('.calc-panel')].map(p=>p.id);
chk(panels.length===8,'8 panels present (got '+panels.length+')');
chk(panels.includes('panel-ipcal'),'impurity profile panel present');
chk(panels.includes('panel-chem'),'structure editor panel present');
chk(d.querySelectorAll('.calc-panel.active').length===1,'exactly one panel active on load');
chk(d.getElementById('panel-charge').classList.contains('active'),'charge tab active on load');

// header / footer strings
chk(d.getElementById('app-title').textContent.includes('Reflux'),'title renders Reflux');
chk(d.getElementById('app-sub').textContent.trim()==='\u00a9 Gary Chan','header sub is bare copyright');
chk(d.getElementById('footer-bug').href.includes('jeuron@gmail.com'),'footer bug link retargeted');
chk(d.getElementById('bugReport').href.includes('jeuron@gmail.com'),'profiler bug link retargeted');
chk(!d.body.innerHTML.match(/kaneka/i),'no employer string in rendered body');
chk(!d.body.innerHTML.match(/KSC/i),'no employer initials in rendered body');
chk(!d.body.innerHTML.match(/ChemSketch/i),'no prior product name in rendered body');
chk(!d.body.textContent.match(/kaneka|KSC|ChemSketch/i),'no employer or prior product string in rendered text');

// tab switching, both directions
window.switchTab('ipcal');
chk(d.getElementById('panel-ipcal').classList.contains('active'),'switch to ipcal activates panel');
chk(d.querySelectorAll('.calc-panel.active').length===1,'still exactly one active after switch');
chk(d.body.classList.contains('wide'),'wide layout applied on ipcal tab');
chk([...d.querySelectorAll('.tab-btn')].filter(b=>b.classList.contains('active')).length===1,'one tab button active');
chk(d.querySelectorAll('.tab-btn')[6].classList.contains('active'),'7th tab button is the active one');
window.switchTab('units');
chk(!d.body.classList.contains('wide'),'wide layout removed leaving ipcal tab');
chk(d.getElementById('panel-units').classList.contains('active'),'switch back works');

// profiler booted: renderAll() populated its containers
chk(d.getElementById('fileCount').textContent.length>0,'profiler renderAll ran (file count rendered)');
chk(d.getElementById('resultsSection').hasAttribute('hidden'),'results hidden before any run');

// theme engine: one toggle drives every panel
const root=d.documentElement;
chk(root.getAttribute('data-theme')==='light','light default');
window.toggleTheme();
chk(root.getAttribute('data-theme')==='dark','toggle -> dark');
chk(window.localStorage.getItem('reflux-theme')==='dark','persisted under reflux-theme');
chk(window.localStorage.getItem('ipcal-theme')===null,'no second theme key written');
chk(window.localStorage.getItem('chem-theme')===null,'no third theme key written');
window.toggleTheme();
chk(root.getAttribute('data-theme')==='light','toggle -> light');

// calculator still computes (charge amount, wt/wt)
const set=(id,v)=>{const e=d.getElementById(id); if(e){e.value=v; e.dispatchEvent(new window.Event('input',{bubbles:true}));} return !!e;};
chk(typeof window.calcCharge==='function','calcCharge exposed');
chk(typeof window.evalEquations==='function','evalEquations exposed');
chk(typeof window.calcUnits==='function','calcUnits exposed');

// ---- structure editor -------------------------------------------------
// Its panel initialises on the load event, so everything below runs after a
// tick. The engine is stripped above, so this also proves the panel degrades
// to a message instead of throwing when the drawing engine is unavailable.
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
  await new Promise(r=>{ if(d.readyState==='complete') r(); else window.addEventListener('load',r); });
  await tick();

  chk(typeof window.refluxChem==='object','refluxChem hook exposed');
  chk(window.refluxChem.isReady()===false,'editor not constructed before the tab is opened');
  chk(d.querySelectorAll('#chem-elpick button').length===9,'9 element chips built without the engine');
  chk(d.querySelectorAll('#chem-templates button').length===10,'10 template buttons built without the engine');
  chk(d.getElementById('chem-composer-host').children.length===0,'composer host still empty before activation');
  chk(d.querySelectorAll('#panel-chem [onclick]').length===0,'structure editor binds no inline handlers');

  window.switchTab('chem');
  chk(d.getElementById('panel-chem').classList.contains('active'),'switch to chem activates panel');
  chk(d.body.classList.contains('wide'),'wide layout applied on chem tab');
  chk(d.querySelectorAll('.tab-btn')[7].classList.contains('active'),'8th tab button is the active one');

  await tick();   // MutationObserver -> bootEditor
  const st=d.getElementById('chem-status');
  chk(/did not load/i.test(st.textContent),'engine absent -> panel degrades to a message ("'+st.textContent.slice(0,44)+'")');
  chk(st.className==='warn','degraded status carries the warn class');
  chk(window.refluxChem.isReady()===false,'editor still reports not ready without the engine');
  let threw=false;
  try{ d.querySelectorAll('#chem-templates button')[0].click();
       d.getElementById('chem-btn-png').click();
       d.getElementById('chem-btn-copy').click(); }catch(e){ threw=true; }
  chk(!threw,'template and export buttons are inert, not throwing, without the engine');
  chk(errs.length===0,'still no uncaught errors after driving the degraded panel ('+errs.slice(0,2)+')');

  window.switchTab('units');
  chk(!d.body.classList.contains('wide'),'wide layout removed leaving the chem tab');

  // ---- deep links -------------------------------------------------------
  // index.html points at one tool with reflux.html#<tab>. Both the live
  // hashchange path and the load-time path have to resolve, and an unknown
  // hash has to fall back rather than reach getElementById("panel-<junk>").
  chk(window.location.hash==='#units','switching a tab writes the hash (got "'+window.location.hash+'")');
  window.location.hash='#ipcal';
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  chk(d.getElementById('panel-ipcal').classList.contains('active'),'hashchange to #ipcal switches tab');
  window.location.hash='#nosuchtab';
  let hashThrew=false;
  try{ window.dispatchEvent(new window.HashChangeEvent('hashchange')); }catch(e){ hashThrew=true; }
  chk(!hashThrew,'unknown hash does not throw');
  chk(d.getElementById('panel-ipcal').classList.contains('active'),'unknown hash leaves the current tab alone');

  const boot=(hash)=>{
    const dd=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/'+hash,
      beforeParse(w){w.ExcelJS={};w.XLSX={utils:{},writeFile(){}};w.math={evaluate:()=>0};}});
    return dd.window.document;
  };
  chk(boot('#ipcal').getElementById('panel-ipcal').classList.contains('active'),'deep link #ipcal opens that tab on load');
  chk(boot('#chem').getElementById('panel-chem').classList.contains('active'),'deep link #chem opens that tab on load');
  chk(boot('#nosuchtab').getElementById('panel-charge').classList.contains('active'),'unknown hash on load falls back to the default tab');
  chk(boot('').getElementById('panel-charge').classList.contains('active'),'no hash on load opens the default tab');

  console.log('\n'+(fails.length?fails.length+' FAILURES':'ALL GREEN'));
  process.exit(fails.length?1:0);
})();
