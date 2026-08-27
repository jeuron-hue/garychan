# Reflux

Process chemistry toolbox. A single self-contained HTML file: six calculators,
an LC/GC impurity profile parser and an offline 2D structure editor. No build
step, no server, no install.

Open `reflux.html` in any modern browser, locally or from a share. There is
nothing to run and nothing to configure.

`index.html` is a splash page listing the eight tools, each linking straight to
its tab. It is the landing page when the repository is served over GitHub Pages;
opened from disk it works the same way, as long as it sits next to
`reflux.html`.

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
| Structure Editor | Offline 2D chemical structure editor. Draw, then copy the structure into Word or PowerPoint as an image. Detail below. |

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
- **Results are tied to their file set:** adding, removing, reordering or
  re-roling a file clears the results, and the export buttons write nothing
  until Calculate is pressed again. An export always describes the file set
  that was loaded when Calculate was pressed, so a column heading cannot end up
  above another sample's numbers.

Sample name and sample ID are editable in the app and flow through to every
export without recalculating: a rename relabels a column, it does not move one.
Column order is editable too, but reordering changes which file set the results
describe, so it clears them and Calculate has to be pressed again. The
originally parsed values are retained internally.

### Deep links

Every tab has a URL. Append the tab key as a hash and the toolbox opens on that
tool:

| Link | Opens |
|---|---|
| `reflux.html` | Charge Amount, the default tab |
| `reflux.html#charge` `#solution` `#ymb` `#units` | those calculators |
| `reflux.html#agiscale` `#equation` | those calculators |
| `reflux.html#ipcal` | Impurity Profile |
| `reflux.html#chem` | Structure Editor |

The hash is honoured on load and on `hashchange`, and switching tabs in the app
keeps the URL in step (via `replaceState`, so the back button is not flooded).
A hash is only acted on when it names a key in `TABS`, so a stale or mistyped
link opens the default tab rather than failing on a missing panel. That is what
the cards on `index.html` use, and `reflux_checks.cjs` asserts every one of
those links names a tab that still exists.

### Structure Editor

Draw a 2D structure and get it into a document. The drawing engine is built
into `reflux.html`, so this tab works with the network disconnected.

- **Atoms:** a quick **Set atom** row (C N O S P F Cl Br I) plus a custom label
  box, applied to whatever is selected. Arbitrary text becomes a labelled
  pseudo-atom, so `R`, `Ph` and `OMe` all work.
- **Bonds:** single, double, triple, wedge and hash, from the editor's bond
  tool. Rings, charges and the eraser are on the same left rail.
- **Templates:** benzene, cyclohexane, cyclopentane, cyclobutane,
  cyclopropane, naphthalene, pyridine, piperidine, furan, thiophene. Repeated
  inserts cascade rather than stacking on one another.
- **Clean up:** runs the engine's `standardize()` on each structure. This is
  not full 2D coordinate auto-layout, which the engine only does through an
  optional WebAssembly module that fetches external data files. Bundling it
  would break the offline guarantee, so it is deliberately left out.
- **Export:** **Copy image** puts a PNG on the clipboard; **PNG** and **SVG**
  download. PNG output is transparent, cropped tight to the structure and
  rendered at roughly 3x the on-screen bond length so it stays sharp when
  pasted. Select part of a drawing to export just that part; with nothing
  selected the whole drawing is used.
- If the browser refuses a clipboard write from a local file, **Copy image**
  falls back to downloading the PNG and says so.

The editor is built the first time you open the tab, not at page load. Two
consequences worth knowing: the first switch to this tab takes about half a
second, and every other tab loads at its usual speed regardless.

The drawing canvas stays light under the dark theme. Its toolbar glyphs are
dark bitmaps baked into the engine's own stylesheet and would be unreadable on
a dark ground, and a light canvas keeps what you draw identical to what you
paste.

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

### Built in

The Structure Editor's engine is vendored directly into `reflux.html`:
Kekule.js 1.0.4 (the `Kekule.Editor.Composer` widget) and Raphael 2.3.0, which
enables the engine's SVG export bridge. Both are MIT-licensed, and both are
pasted in verbatim rather than fetched or built. Together with the engine's
theme stylesheet they account for roughly 2.8 MB of the file.

This tool arrived with a build script that fetched both libraries from npm and
inlined them. That step has been resolved away, not adopted. What it used to
guarantee is now asserted instead: the version pins and a SHA-256 for each
payload live in the HTML comment header, and `reflux_checks.cjs` recomputes and
compares them, so the payloads cannot drift unnoticed. The two injection guards
the build script applied (no `</script` inside an inlined script, no `</style`
inside an inlined stylesheet) are assertions in the same place.

To move to a newer engine version, fetch the replacement, paste it in, and
update the version and fingerprint in the header. There is no build to run.

### From CDN

Three libraries load from CDN at page open:

| Library | Used for |
|---|---|
| ExcelJS 4.4.0 | Impurity Profile XLSX export (wrapped header rows, sensible column widths) |
| SheetJS 0.20.3 | Calculator Excel exports |
| math.js 12.4.1 | Equation Builder expression evaluation |

Everything else runs offline, the Structure Editor included. Losing CDN access
disables the exports and the Equation Builder; all other calculation, and all
of the Structure Editor, continues to work. If the tool needs to run on a
network that blocks CDNs, these three libraries have to be inlined the way the
structure engine already is, which is a separate job.

---

## Structure

Two files. `index.html` is the splash page: one stylesheet, one script in an
IIFE, no inline handlers, and no dependency on `reflux.html` beyond the links.
It shares the toolbox palette, typefaces and theme key deliberately, so a theme
chosen on either page is the one the other opens with.

`reflux.html` is the toolbox itself: three authored scripts, plus two vendored
engine blocks.

- The calculator script runs at global scope, because the calculator panels use
  inline `onclick` handlers that need to resolve there.
- The Impurity Profile script is fully enclosed in an IIFE and binds through
  `addEventListener`, so its internals never reach the global namespace.
- The Structure Editor script is likewise an IIFE binding through
  `addEventListener`. It exposes exactly one global, `window.refluxChem`, as a
  scripting and test hook.
- The two vendored blocks (`chem-lib-raphael`, `chem-lib-kekule`) are
  third-party UMD bundles and necessarily run at global scope, as the three CDN
  libraries already do.

The panels were separate tools before being merged and their CSS was written
independently. The profiler's variables and selectors are therefore scoped to
`#panel-ipcal` rather than `:root`. Six custom property names are shared
between the halves (`--accent`, `--accent-dim`, `--bg-card`, `--bg-input`,
`--border`, `--text-muted`) and the profiler also styles bare element selectors
(`body`, `h2`, `label`, `input`, `select`, `button`, `table`), all of which
would otherwise bleed across every tab. Keep that scoping in place when editing.

The Structure Editor's CSS is scoped the same way, to `#panel-chem`. It styled
`:root`, `*`, `html`, `body`, `header` and `footer` as a standalone page, and
its `.card` and `.btn` classes collided with the shell's, so every class and id
in that panel carries a `chem-` prefix. Its four colliding custom properties
were dropped rather than renamed: the panel reads the shell palette, and the
few values with no shell equivalent are declared as `--chem-*`.

The vendored engine stylesheet is scoped to `#panel-chem` too, across all 985
of its selectors, with exactly one deliberate exception:
`span.K-StyleSheet-Detector` stays global. The engine checks whether its own
stylesheet loaded by injecting that span into `document.body` and reading its
computed `z-index`. Scoping it would fail that check and make the engine inject
an `@import` for an external theme file, which would break the offline
guarantee. `reflux_checks.cjs` asserts that this is the only unscoped selector.

Theme is a single `data-theme` attribute on the root element, persisted in
`localStorage` under `reflux-theme`. Light is the default. One toggle drives
every panel.

Version lives in the HTML comment header only, never on the page.

---

## Tests

Four suites. All must pass before the file is considered shippable.

```
npm install jsdom
node reflux_checks.cjs      # static: residue, structure, scoping, syntax, wiring
node behave.cjs             # behavioural: tabs, panels, theme, exposed handlers
node e2e.cjs                # end to end: parses fixtures, checks computed values
node view.cjs               # rendered: measures real boxes in headless Chrome
./mutate.sh                 # mutation: confirms the suites actually bite
```

The first three run on Node with jsdom. `view.cjs` does not: it drives a
headless Chrome or Edge over the DevTools protocol and measures the boxes the
browser actually produced. It needs a Chrome or Edge on the machine and honours
`CHROME_PATH`, but adds no dependency.

The three see different things, and the difference is the point.
`reflux_checks.cjs` reads the file as text, so it can confirm a rule was
written but not that it rendered. `behave.cjs` drives the page under jsdom,
which does no layout, so every box there measures zero and no size can be
asserted. `view.cjs` is the only one that catches a layout defect that leaves
every rule intact.

`e2e.cjs` builds LabSolutions-shaped fixtures in memory, drives the real file
input, and checks computed RRT and Area% values against hand arithmetic. It
also runs the Mode 2 over-subtraction case, where a blank larger than the
sample drives the corrected reference area negative, since that is the
condition under which Area% output previously came back blank.

`e2e.cjs` also holds the file-set staleness case: it calculates over three
samples, exports, and then removes and reorders a sample to confirm the results
and every export path go quiet until Calculate is pressed again. It asserts the
invariant the old defect broke, that every exported row is the width of its
header row, and that a rename still leaves the results standing.

`mutate.sh` injects fifty-three deliberate defects and confirms each one turns
a suite red. Eight of them target the splash page, the deep links and checkout
hygiene, mutating `index.html` and `.gitattributes` rather than `reflux.html`,
so the cross-file assertions are proven rather than assumed. A mutation that is
not caught is a gap in the tests, not a pass. A mutation whose target string no
longer exists is also a gap, because it has silently stopped testing anything,
so it is reported as `STALE` and fails the run. Note that mutation results only
mean anything against a green baseline; run the four suites first.

`behave.cjs` and `e2e.cjs` strip the two vendored engine blocks before loading
the file, exactly as they already strip the CDN script tags. The engine is 2.7
MB of third-party code they do not test, and its editor needs a real canvas
that jsdom does not provide. Stripping it also exercises the Structure Editor's
engine-absent path, which must degrade to a message rather than throw.

What this does not cover: structure rendering and PNG/SVG export cannot run
under jsdom, so they are not asserted here. Those paths were verified in
Chromium by hand. If they need locking down, that means a browser-driven suite,
not another jsdom assertion.

---

## Editing

- Work from the current file, never a reconstruction.
- Keep the profiler and structure-editor CSS scoped, and both scripts inside
  their IIFEs.
- The vendored engine blocks are not hand-edited. To change them, replace the
  payload and update its fingerprint in the header comment.
- Adding a tab means four edits that must stay in step: the button in
  `.tab-bar`, the `id="panel-<key>"` div, the key in the `TABS` array, and a
  card on `index.html` linking to `reflux.html#<key>`. The static checker
  verifies all four agree, including the card order.
- Impurity Profile results describe one file set in one order. Anything that
  changes which files are loaded, or their order, must invalidate them through
  `renderAll()`, and the exports must keep reading the sample list captured at
  calculation time.
- Run all four suites plus the mutation script before committing.

---

© Gary Chan

Bug reports: jeuron@gmail.com. Attach screenshots of inputs and output, and for
Impurity Profile issues attach the input files and the exported output so the
result can be reproduced.
