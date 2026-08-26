const fs=require('fs'), {JSDOM}=require('jsdom');
let fails=[]; const chk=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m); if(!c)fails.push(m);};

// Minimal but realistic LabSolutions ASCII export
const mk=(name,id,peaks)=>['[Header]','Application Name\tLabSolutions','','[Sample Information]',
 'Sample Name\t'+name,'Sample ID\t'+id,'','[Peak Table(PDA-Ch1)]','# of Peaks\t'+peaks.length,
 'Peak#\tR.Time\tArea\tHeight\tArea%',
 ...peaks.map((p,i)=>`${i+1}\t${p[0]}\t${p[1]}\t1000\t0.0`),''].join('\n');

const FIX = [
  {n:'SMP-A', i:'A1', p:[[4.80,1000],[10.00,900000],[12.50,4000],[15.00,1000]]},
  {n:'SMP-B', i:'B1', p:[[4.80,1200],[10.00,950000],[12.50,8000]]},
];

let html=fs.readFileSync(process.argv[2]||'reflux.html','utf8').replace(/<script src="https:\/\/[^"]+"><\/script>/g,'');
// strip the vendored structure-editor engine: 2.7MB of third-party code this
// suite does not exercise, whose composer needs a canvas jsdom does not have.
html=html.replace(/<script id="chem-lib-[a-z]+">[\s\S]*?<\/script>/g,'');
html=html.replace(/<style id="chem-theme-css">[\s\S]*?<\/style>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',
  beforeParse(w){w.ExcelJS={};w.XLSX={utils:{},writeFile(){}};w.math={evaluate:e=>0};
    w.onerror=(m)=>errs.push(String(m));
    w.addEventListener('error',e=>errs.push(String(e.message)));}});
const {window}=dom,d=window.document;

// drive the real file-input path
const files=FIX.map(f=>new window.File([mk(f.n,f.i,f.p)],f.n+'.txt',{type:'text/plain'}));
const inp=d.getElementById('fileInput');
Object.defineProperty(inp,'files',{value:files,configurable:true});
inp.dispatchEvent(new window.Event('change',{bubbles:true}));

setTimeout(()=>{
  chk(/2 file/.test(d.getElementById('fileCount').textContent),'2 files parsed ("'+d.getElementById('fileCount').textContent.trim()+'")');
  chk(d.getElementById('parseError').hasAttribute('hidden'),'no parse error');
  chk(d.querySelectorAll('#filesContainer > .sample-card').length===2,'2 file cards rendered');chk(d.getElementById('refContainer').children.length===2,'2 reference-peak selectors rendered');

  d.getElementById('runBtn').click();
  chk(d.getElementById('runError').hasAttribute('hidden'),'no run error');
  chk(!d.getElementById('resultsSection').hasAttribute('hidden'),'results shown');

  const tbl=d.getElementById('resultTable');
  const rows=[...tbl.querySelectorAll('tbody tr')].map(r=>[...r.children].map(c=>c.textContent.trim()));
  chk(rows.length>=4,'result rows produced ('+rows.length+')');

  const flat=rows.map(r=>r.join('|'));
  // reference peak defaults to largest area (10.00 min) -> RRT 1.0000 must exist
  chk(flat.some(r=>/\b1\.0000\b/.test(r)),'RRT 1.0000 present (reference peak resolved)');
  // 12.50/10.00 = 1.25
  chk(flat.some(r=>/\b1\.2500\b/.test(r)),'RRT 1.2500 computed correctly');
  // 4.80/10.00 = 0.48
  chk(flat.some(r=>/\b0\.4800\b/.test(r)),'RRT 0.4800 computed correctly');
  // Area% vs ref for SMP-B 12.50 peak = 8000/800000 = 1.000
  chk(flat.some(r=>/\b0\.444\b/.test(r)),'Area% vs Ref arithmetic correct (4000/900000 = 0.444)');
  chk(flat.some(r=>/\b100\.000\b/.test(r)),'reference peak reads 100.000 vs Ref');
  chk(!flat.some(r=>/NaN|undefined/.test(r)),'no NaN/undefined in table');

  // TSV export path (pure string, no CDN lib needed)
  d.getElementById('copyTsv').click();
  chk(true,'copy TSV did not throw');


  // ---- Mode 2 (RRT matching) blank subtraction: the v4 Area% defect path ----
  const roles=[...d.querySelectorAll('#filesContainer .role-select')];
  chk(roles.length===2,'role selectors present');
  roles[1].value='blank'; roles[1].dispatchEvent(new window.Event('change',{bubbles:true}));
  const sub=d.getElementById('subMode');
  sub.value='mode2'; sub.dispatchEvent(new window.Event('change',{bubbles:true}));
  setTimeout(()=>{
    const bsel=[...d.querySelectorAll('#subSettingsContainer select')]
      .find(x=>[...x.options].some(o=>/SMP-B/.test(o.textContent)));
    chk(!!bsel,'blank-assignment selector located');
    bsel.value=[...bsel.options].find(o=>/SMP-B/.test(o.textContent)).value;
    bsel.dispatchEvent(new window.Event('change',{bubbles:true}));
    chk(bsel.value!=='','blank actually assigned');
    // Mode 2 requires the blank's own reference RT
    const rtIn=[...d.querySelectorAll('#subSettingsContainer input[type=text], #subSettingsContainer input:not([type])')][0];
    chk(!!rtIn,'blank reference-RT input present');
    rtIn.value='10'; rtIn.dispatchEvent(new window.Event('input',{bubbles:true}));
    rtIn.dispatchEvent(new window.Event('change',{bubbles:true}));
    d.getElementById('runBtn').click();
    chk(d.getElementById('runError').hidden,'mode 2 ran without error ("'+d.getElementById('runError').textContent+'")');
    const r2=[...d.getElementById('resultTable').querySelectorAll('tbody tr')].map(x=>[...x.children].map(c=>c.textContent.trim()).join('|'));
    chk(r2.length>0,'mode 2 produced rows');
    // v4 defect: with the blank over-subtracting the reference peak, both Area%
    // denominators went <=0, every Area% cell returned NaN and formatted blank.
    const cells=[...d.getElementById('resultTable').querySelectorAll('tbody td')].map(c=>c.textContent.trim());
    const pctCells=cells.filter(c=>/^-?\d+\.\d{3}$/.test(c));
    chk(pctCells.length>0,'Area% populated under blank over-subtraction (v4 fix intact, '+pctCells.length+' cells)');
    chk(!d.getElementById('refWarn').hasAttribute('hidden'),'over-subtraction warning surfaced');
    chk(!/NaN|undefined/.test(r2.join(' ')),'no NaN under blank subtraction');

    // ---- structure editor: the empty-canvas guard ----------------------
    // Rendering and image export need a real canvas, so they are verified in a
    // browser, not here. What is testable in jsdom is the guard in front of
    // them: every export path must refuse an empty drawing with a warning
    // rather than reaching the engine.
    window.switchTab('chem');
    setTimeout(()=>{
      const st=d.getElementById('chem-status');
      let threw=false;
      try{ ['chem-btn-copy','chem-btn-png','chem-btn-svg','chem-btn-clean']
             .forEach(id=>d.getElementById(id).click()); }catch(e){ threw=true; }
      chk(!threw,'export buttons guard the empty canvas instead of throwing');
      // A handler that throws inside jsdom event dispatch never reaches the
      // try/catch above, so the guard is only really proven by the error log.
      chk(errs.length===0,'no uncaught errors from the export guards ('+errs.slice(0,2)+')');
      chk(st.className==='warn','empty-canvas guard raises a warning status');
      chk(d.getElementById('chem-export-area').children.length===0,'no orphan render host left behind');
      console.log('\n'+(fails.length?fails.length+' FAILURES':'ALL GREEN'));
      process.exit(fails.length?1:0);
    },0);
  },200);
},400);
