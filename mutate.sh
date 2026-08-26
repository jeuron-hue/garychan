#!/bin/bash
pass=0; fail=0
run(){ # name, sed-expr, suite
  cp reflux.html mut.html
  python3 -c "
import sys,io
s=open('mut.html',encoding='utf-8').read()
old,new='''$2''','''$3'''
assert old in s, 'MUTATION TARGET NOT FOUND: $1'
open('mut.html','w',encoding='utf-8').write(s.replace(old,new,1))"
  if [ $? -ne 0 ]; then echo "SKIP  $1 (target missing)"; return; fi
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
echo "--- behavioural ---"
run "wide-layout toggle dropped" "document.body.classList.toggle(\"wide\",id===\"ipcal\");" "" behave.cjs
run "panel not registered active" "document.getElementById(\"panel-\"+id).classList.add(\"active\");" "" behave.cjs
run "theme default flipped to dark" "data-theme=\"light\">" "data-theme=\"dark\">" behave.cjs
echo "--- end-to-end arithmetic ---"
run "RRT inverted" "var rrt = cp.rt / refPeak.rt;" "var rrt = refPeak.rt / cp.rt;" e2e.cjs
run "v4 Area% fix reverted (negatives back in denominator)" "cp.corrected > 0 ? cp.corrected : 0" "cp.corrected" e2e.cjs
echo
echo "caught $pass, missed $fail"
rm -f mut.html
