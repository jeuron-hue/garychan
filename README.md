# Reflux

Process chemistry toolbox. A single self-contained HTML file: seven calculators
and an LC/GC impurity profile parser, no build step, no server, no install.

Open `reflux.html` in any modern browser, locally or from a share. There is
nothing to run and nothing to configure.

---

## Tools

| Tab | What it does |
|---|---|
| Charge Amount | Charge quantities from a ratio basis. wt/wt, mol/mol, vol/wt, wt/vol, vol/vol. |
| Solution Prep | Prepare from solid, dilute from stock, or solve a molarity relation with any three of four terms. |
| Yield & Mass Balance | Molar yield, mass balance across splits, or both. Per-block mode selection. |
| Unit Converter | Common chemistry and engineering units. Pressure converter live-syncs kgf/cm2 gauge, mmHg absolute and hPa absolute. |
| Agitation Scale-up | Geometric scale-up of agitated vessels. Adapted from CheCalc methodology. |
| Equation Builder | User-defined variables and equations. Results chain forward, so each equation's result is available to later ones. |
| Impurity Profile | Chromatography peak table parser and impurity profile calculator. Detail below. |

### Impurity Profile

Reads exported peak tables and produces a grouped, cross-sample impurity table.

- **Input:** Shimadzu LabSolutions ASCII (`.txt`, `.asc`) and Agilent GC CSV.
  Vendor is auto-detected: LabSolutions exports open with `[Header]`, Agilent
  exports with `Data file:`. Multiple files load at once.
- **Peak table selection:** where a method emits several peak table sections
  (Detector A, PDA-Ch1, PDA-Ch2), the populated one is chosen by its
  `# of Peaks` count rather than by section name, because an empty section can
  precede the populated channel.
- **Reference peak:** chosen per sample from a dropdown listing every peak by
  number, retention time and area. Defaults to the largest-area peak.
- **RRT grouping:** peaks are grouped by RRT rounded to a selectable number of
  decimal places, so the same impurity lines up across samples.
- **Blank subtraction:** off, Mode 1 (RT matching, with a tolerance), or Mode 2
  (RRT matching, which needs the blank's own reference RT). Negative or zero
  corrected areas are either eliminated or shown in red beneath the positives.
- **Spec flagging:** an optional Area% limit per sample highlights peaks that
  exceed it, on screen and in the XLSX export.
- **Output:** CSV, TSV, XLSX, or the whole table to clipboard as TSV for direct
  paste into a sheet.

Sample name, sample ID and column order are editable in the app and flow
through to every export. The originally parsed values are retained internally.

---

## Notes on the calculations

- Area% denominators use positive corrected peaks only. Including negatives
  drives the denominator to zero or below whenever a blank over-subtracts, and
  every percentage then returns as blank.
- When a sample's corrected reference area comes out zero or negative, Area%
  vs Ref is suppressed for that sample and a warning appears under the results.
  In practice this means the blank was over-subtracted on the reference peak,
  which is what happens when a pure-solvent blank is run through Mode 2. Try
  Mode 1 instead.
- Pressure conversions treat production units (kgf/cm2) as gauge and lab units
  (mmHg, hPa) as absolute. The three fields stay in sync as any one is edited.
- Agitation scale-up is geometric. It assumes similar vessel geometry between
  scales and will mislead if that does not hold.

---

## Dependencies

Three libraries load from CDN at page open:

| Library | Used for |
|---|---|
| ExcelJS 4.4.0 | Impurity Profile XLSX export (wrapped header rows, sensible column widths) |
| SheetJS 0.20.3 | Calculator Excel exports |
| math.js 12.4.1 | Equation Builder expression evaluation |

Everything else runs offline. Losing CDN access disables the exports and the
Equation Builder; all other calculation continues to work. If the tool needs to
run on a network that blocks CDNs, the three libraries have to be inlined,
which is a separate job.

---

## Structure

One file. Two scripts inside it:

- The calculator script runs at global scope, because the calculator panels use
  inline `onclick` handlers that need to resolve there.
- The Impurity Profile script is fully enclosed in an IIFE and binds through
  `addEventListener`, so its internals never reach the global namespace.

The two halves were separate tools before v1 and their CSS was written
independently. The profiler's variables and selectors are therefore scoped to
`#panel-ipcal` rather than `:root`. Six custom property names are shared
between the halves (`--accent`, `--accent-dim`, `--bg-card`, `--bg-input`,
`--border`, `--text-muted`) and the profiler also styles bare element selectors
(`body`, `h2`, `label`, `input`, `select`, `button`, `table`), all of which
would otherwise bleed across every tab. Keep that scoping in place when editing.

Theme is a single `data-theme` attribute on the root element, persisted in
`localStorage` under `reflux-theme`. Light is the default. One toggle drives
both halves.

Version lives in the HTML comment header only, never on the page.

---

## Tests

Three suites, Node with jsdom. All must pass before the file is considered
shippable.

```
npm install jsdom
node reflux_checks.cjs      # static: residue, structure, scoping, syntax, wiring
node behave.cjs             # behavioural: tabs, panels, theme, exposed handlers
node e2e.cjs                # end to end: parses fixtures, checks computed values
./mutate.sh                 # mutation: confirms the suites actually bite
```

`e2e.cjs` builds LabSolutions-shaped fixtures in memory, drives the real file
input, and checks computed RRT and Area% values against hand arithmetic. It
also runs the Mode 2 over-subtraction case, where a blank larger than the
sample drives the corrected reference area negative, since that is the
condition under which Area% output previously came back blank.

`mutate.sh` injects fourteen deliberate defects and confirms each one turns a
suite red. A mutation that is not caught is a gap in the tests, not a
pass. Note that mutation results only mean anything against a green baseline;
run the three suites first.

---

## Editing

- Work from the current file, never a reconstruction.
- Keep the profiler CSS scoped and its script inside its IIFE.
- Adding a tab means three edits that must stay in step: the button in
  `.tab-bar`, the `id="panel-<key>"` div, and the key in the `TABS` array. The
  static checker verifies the three agree.
- Run all three suites plus the mutation script before committing.

---

© Gary Chan

Bug reports: jeuron@gmail.com. Attach screenshots of inputs and output, and for
Impurity Profile issues attach the input files and the exported output so the
result can be reproduced.
