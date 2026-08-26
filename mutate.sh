#!/bin/bash
# Injects deliberate defects and confirms each one turns a suite red.
# A mutation that is not caught is a gap in the tests, not a pass. A mutation
# whose target string no longer exists is also a gap: it has silently stopped
# testing anything, so it counts as a failure rather than being skipped.
SRC="${1:-reflux.html}"
pass=0; fail=0; stale=0
run(){ # name, old, new, suite
  cp "$SRC" mut.html
  python3 -c "
import sys,io
s=open('mut.html',encoding='utf-8').read()
old,new='''$2''','''$3'''
assert old in s, 'MUTATION TARGET NOT FOUND: $1'
open('mut.html','w',encoding='utf-8').write(s.replace(old,new,1))"
  if [ $? -ne 0 ]; then echo "STALE       $1  <-- target missing, mutation tests nothing"; stale=$((stale+1)); return; fi
  if node "$4" mut.html >/dev/null 2>&1; then echo "NOT CAUGHT  $1  <-- checker gap"; fail=$((fail+1));
  else echo "caught      $1"; pass=$((pass+1)); fi
}
# --- static checker mutations ---
run "employer string reintroduced" "Gary Chan" "Gary Chan, KSC" reflux_checks.cjs
run "profiler CSS unscoped" "#panel-ipcal .sample-card {" ".sample-card {" reflux_checks.cjs
run "colliding var leaks to root" "#panel-ipcal {\n      --bg:" ":root {\n      --bg:" reflux_checks.cjs
run "tab added to bar but not TABS" "switchTab('ipcal')\">Impurity Profile</button>" "switchTab('ipcal')\">Impurity Profile</button><button class=\"tab-btn\" onclick=\"switchTab('bogus')\">X</button>" reflux_checks.cjs
run "second theme key reintroduced" "reflux-theme\",next" "ipcal-theme\",next" reflux_checks.cjs
run "IIFE opened around profiler removed" "(function () {
  'use strict';" "'use strict';" reflux_checks.cjs
run "syntax error injected" "function switchTab(id){" "function switchTab(id){{" reflux_checks.cjs
run "duplicate element id" "id=\"runBtn\"" "id=\"fileInput\"" reflux_checks.cjs
run "old contact address restored" "CONTACT=\"jeuron@gmail.com\"" "CONTACT=\"gary.chan@kaneka.sg\"" reflux_checks.cjs
echo "--- structure editor: static ---"
run "structure-editor CSS unscoped" "#panel-chem .chem-bar {" ".chem-bar {" reflux_checks.cjs
run "structure-editor var collides with shell" "--chem-chip: var(--bg-input);" "--bg: var(--bg-input);" reflux_checks.cjs
run "employer string back on the structure-editor tab" "switchTab('chem')\">Structure Editor</button>" "switchTab('chem')\">KSC Structure Editor</button>" reflux_checks.cjs
run "structure-editor IIFE signature broken" "<script id=\"chem-app\">\n(function(){" "<script id=\"chem-app\">\n(async function(){" reflux_checks.cjs
run "header version drifts from the rendered version" "APP_VER=\"v2\"" "APP_VER=\"v1\"" reflux_checks.cjs
run "branded global reinstated" "window.refluxChem = {" "window.kscChemSketch = {" reflux_checks.cjs
run "vendored engine payload altered" "<style id=\"chem-theme-css\">" "<style id=\"chem-theme-css\">/*x*/" reflux_checks.cjs
run "dead colour-swatch rule reintroduced" "span.K-StyleSheet-Detector{" ".K-Res-Icon-Color-NotSet{color:red}span.K-StyleSheet-Detector{" reflux_checks.cjs
run "engine sheet scope exemption widened" "#panel-chem .K-Chem-Composer{" ".K-Chem-Composer{" reflux_checks.cjs
echo "--- behavioural ---"
run "wide-layout toggle dropped" "document.body.classList.toggle(\"wide\",id===\"ipcal\"||id===\"chem\");" "" behave.cjs
run "panel not registered active" "document.getElementById(\"panel-\"+id).classList.add(\"active\");" "" behave.cjs
run "theme default flipped to dark" "data-theme=\"light\">" "data-theme=\"dark\">" behave.cjs
run "structure-editor tab dropped from the bar" "<button class=\"tab-btn\" onclick=\"switchTab('chem')\">Structure Editor</button>" "" behave.cjs
run "missing-engine guard removed" "if (typeof Kekule === 'undefined' ||" "if (false \&\& typeof Kekule === 'undefined' ||" behave.cjs
run "static UI no longer built at load" "    buildElementPicker();\n    buildTemplateButtons();" "    buildElementPicker();" behave.cjs
run "activation no longer boots the editor" "if (panel.classList.contains('active')){ obs.disconnect(); bootEditor(); }" "if (false){ obs.disconnect(); bootEditor(); }" behave.cjs
echo "--- end-to-end arithmetic ---"
run "RRT inverted" "var rrt = cp.rt / refPeak.rt;" "var rrt = refPeak.rt / cp.rt;" e2e.cjs
run "v4 Area% fix reverted (negatives back in denominator)" "cp.corrected > 0 ? cp.corrected : 0" "cp.corrected" e2e.cjs
run "empty-canvas export guard removed" "  function emptyGuard(){\n    if (engineGuard()) return true;" "  function emptyGuard(){\n    if (false) return true;" e2e.cjs
echo
echo "caught $pass, missed $fail, stale $stale"
rm -f mut.html
[ $fail -eq 0 ] && [ $stale -eq 0 ]
