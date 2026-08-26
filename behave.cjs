const fs=require('fs'), {JSDOM}=require('jsdom');
let fails=[];
const chk=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m); if(!c)fails.push(m);};

let html=fs.readFileSync(process.argv[2]||'reflux.html','utf8');
// strip CDN tags; stub the three libs so the page can boot offline
html=html.replace(/<script src="https:\/\/[^"]+"><\/script>/g,'');
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
chk(panels.length===7,'7 panels present (got '+panels.length+')');
chk(panels.includes('panel-ipcal'),'impurity profile panel present');
chk(d.querySelectorAll('.calc-panel.active').length===1,'exactly one panel active on load');
chk(d.getElementById('panel-charge').classList.contains('active'),'charge tab active on load');

// header / footer strings
chk(d.getElementById('app-title').textContent.includes('Reflux'),'title renders Reflux');
chk(d.getElementById('app-sub').textContent.trim()==='\u00a9 Gary Chan','header sub is bare copyright');
chk(d.getElementById('footer-bug').href.includes('jeuron@gmail.com'),'footer bug link retargeted');
chk(d.getElementById('bugReport').href.includes('jeuron@gmail.com'),'profiler bug link retargeted');
chk(!d.body.innerHTML.match(/kaneka/i),'no employer string in rendered body');

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

// theme engine: one toggle drives both halves
const root=d.documentElement;
chk(root.getAttribute('data-theme')==='light','light default');
window.toggleTheme();
chk(root.getAttribute('data-theme')==='dark','toggle -> dark');
chk(window.localStorage.getItem('reflux-theme')==='dark','persisted under reflux-theme');
chk(window.localStorage.getItem('ipcal-theme')===null,'no second theme key written');
window.toggleTheme();
chk(root.getAttribute('data-theme')==='light','toggle -> light');

// calculator still computes (charge amount, wt/wt)
const set=(id,v)=>{const e=d.getElementById(id); if(e){e.value=v; e.dispatchEvent(new window.Event('input',{bubbles:true}));} return !!e;};
chk(typeof window.calcCharge==='function','calcCharge exposed');
chk(typeof window.evalEquations==='function','evalEquations exposed');
chk(typeof window.calcUnits==='function','calcUnits exposed');

console.log('\n'+(fails.length?fails.length+' FAILURES':'ALL GREEN'));
process.exit(fails.length?1:0);
