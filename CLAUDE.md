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
- Adding a tab means three edits that must stay in step: the button in
  `.tab-bar`, the `id="panel-<key>"` div, and the key in the `TABS` array.

## Process

- Scope before building. State the plan and wait for approval before writing
  code. Do not generate a full file unprompted.
- Work from the actual current file, never a reconstruction.
- Never commit a partial build.

## Testing

All four must pass before any commit:

    node reflux_checks.cjs
    node behave.cjs
    node e2e.cjs
    ./mutate.sh

The suites take an optional file path argument. mutate.sh injects deliberate
defects and confirms each turns a suite red; a mutation that is not caught is
a gap in the tests, not a pass. Mutation results are meaningless against a red
baseline, so confirm the three suites are green first.

New functionality needs new assertions in the suites and new mutations in
mutate.sh. Extending the code without extending the tests is not done.
