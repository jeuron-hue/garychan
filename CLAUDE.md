# Reflux

Single self-contained static HTML file. Vanilla JS and CSS. No framework, no
build step, no server, no bundler, no npm dependencies at runtime.

## Hard rules

- One file. Everything ships inside reflux.html.
- No build step. The file is hand-maintained and directly deployable. Anything
  merged in from a tool that had a build step must have that step resolved
  away, not adopted.
- No prior-employer strings anywhere, including git history and code comments.
  Contact address is jeuron@gmail.com. Copyright line is "© Gary Chan".
- Version lives in the HTML comment header and is rendered into reflux.html's
  page title from APP_VER. The two must stay in step; reflux_checks.cjs asserts
  they match. index.html carries no version.
- Each tool's CSS is scoped to its own `#panel-<key>` selector, never `:root`.
  The panels were separate tools originally and share custom property names.
- Any script other than the calculator script is wrapped in an IIFE and binds
  through addEventListener. Only the calculator script sits at global scope,
  because the calculator panels use inline onclick handlers.
- Theme is one `data-theme` attribute on the root element, persisted under
  `reflux-theme`. Light default. One toggle drives every panel.
- Adding a tab means four edits that must stay in step: the button in
  `.tab-bar`, the `id="panel-<key>"` div, the key in the `TABS` array, and a
  card on index.html linking to `reflux.html#<key>`. reflux_checks.cjs asserts
  all four agree, card order included.
- The calculator panels build markup as strings, so every value that came from
  a text field goes through `esc()` on the way in. The Impurity Profile half
  builds its DOM with createElement and textContent; do not mix the two styles
  within a panel.
- Impurity Profile results describe one file set in one order. Anything that
  changes which files are loaded, or their order, invalidates them and must go
  through `renderAll()`, which is the single choke point that clears them.
  Exports read the sample list captured at calculation time, never the live
  one: taking headers from one and data from the other files every number under
  the wrong sample name, silently. Renaming a sample is deliberately exempt —
  it relabels a column, it does not move one.

## Process

- Scope before building. State the plan and wait for approval before writing
  code. Do not generate a full file unprompted.
- Work from the actual current file, never a reconstruction.
- Never commit a partial build.

## Testing

All five must pass before any commit:

    node reflux_checks.cjs
    node behave.cjs
    node e2e.cjs
    node view.cjs
    ./mutate.sh

The suites take an optional file path argument. mutate.sh injects deliberate
defects and confirms each turns a suite red; a mutation that is not caught is
a gap in the tests, not a pass. Mutation results are meaningless against a red
baseline, so confirm the four suites are green first.

They see different things. behave.cjs drives the page under jsdom, which does
no layout, so every box there measures zero and no size can be asserted.
reflux_checks.cjs reads the file as text and can only confirm a rule was
written, not that it rendered. view.cjs drives headless Chrome over the
DevTools protocol and measures the boxes the browser produced, which is the
only suite that sees a layout defect leaving every rule intact. It needs a
Chrome or Edge on the machine and honours CHROME_PATH; it adds no dependency.

New functionality needs new assertions in the suites and new mutations in
mutate.sh. Extending the code without extending the tests is not done.
