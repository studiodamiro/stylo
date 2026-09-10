---
title: "Tracker — making Stylo dependable for downstream projects"
created: 2026-09-11
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Tracker — making Stylo dependable for downstream projects

Goal: close every open thread a project **consuming** Stylo could hit, plus the
deferred feature gaps, so Stylo can be a stable dependency across more than one
codebase. Not a 1.0 polish pass — a "nothing here bites a consumer or surprises a
maintainer" pass.

## Audit result (2026-09-11)

Fresh-install check: `npm pack` → install the tarball into a new Vite + React 18
app → `tsc` (against the published `.d.ts`, `moduleResolution: bundler`) → `vite
build`. All clean. Real-Chrome smoke of every surface (`in-place` / `source` /
`preview` / `split`, incl. math, editable tables, embeds, dark theme): renders
correctly, no console or page errors, edit interactions work.

**No blockers.** Packaging, the type surface, and the runtime are sound. The work
below is completion and hardening.

## Dependencies

**No item adds a runtime or peer dependency.** The zero-bloat rule (ADR-gated new
deps, `CONTRIBUTING.md`) is not triggered. The only `package.json` change in the
whole list is item 5, and it is `devDependencies` only — a second `@types/react`
line used by a CI type-check, nothing shipped.

## Worklist — smallest to largest

Each item is its own branch + PR, same cadence as the toolbar-customizer and
wikilink-autocomplete increments. Check items off here as they land.

### 1 — Document the ESM-only constraint · size XS · deps: none

`package.json` `exports` has no `require` condition: Stylo is ESM-only and needs a
bundler (Vite, Next, …). Say so plainly in the README, and put the minimum React
version and the two CSS imports (`styles.css`, `katex.css`) in one place in
`docs/wiki/guides/integration.md`.

### 2 — Integration-guide accuracy pass · size S · deps: none

Re-read `docs/wiki/guides/integration.md` end to end against the current prop set
— embeds on all three surfaces, `wikiLinkSource`, the `@damiro/stylo/toolbar-settings`
secondary entry — and fix drift. Pairs naturally with item 1.

### 3 — `ref`-keyed embed memo · size S · deps: none

An embed scrolled out of the viewport and back re-invokes `embedSource` (the
widget is rebuilt, the portal remounts). Add a small `ref`-keyed cache of
resolved nodes, invalidated on `ref` change, shared by `preview` and the canvas.
Cap its size so it can't grow unbounded. (ADR-009 deferred item.)

### 4 — `onResolveError` for `embedSource` / `wikiLinkSource` · size S–M · deps: none

Today a thrown or rejected resolver silently falls back to literal text. A
consumer wiring these to a network source has no hook to log or surface the
failure. Add one optional callback prop; thread it `Stylo → Preview /
InPlaceView → Embed`; call it on `catch`. New optional prop, no behaviour change
when omitted.

### 5 — React 18 type-surface guard · size M · deps: dev-only

`@types/react` is v19 in `devDependencies` while the peer range is `>=18`. A
React 18 consumer `tsc` passed in the audit, but nothing stops a v19-only type
from leaking into an emitted `.d.ts`. Add a CI step that type-checks a tiny
consumer against `@types/react@18`. Can be folded into item 6's job.

### 6 — Packaging smoke in CI · size M · deps: none

Add a job: `npm pack` → install the tarball into a throwaway consumer → `tsc` +
a build. Catches a broken `exports` map, a missing `.d.ts`, or an accidental hard
dependency before it reaches a downstream project. Done once by hand in the
audit; this makes it a gate. The throwaway consumer installs its own dev tools —
nothing added to Stylo.

### 7 — Inline `![[…]]` mid-paragraph · size M–L · deps: none

An embed is recognised only when it is the whole line/paragraph; inside a
sentence it stays literal on every surface, because a block `<div>` can't nest in
a `<p>`. Add an inline wrapper (a `<span>`-hosted embed) on the `preview`
pipeline and an inline (non-`block`) widget + slot on the in-place canvas. The
portal bridge extends to inline slots. Tests on both surfaces. (ADR-009 deferred.)

### 8 — `![[…]]` inside editable table cells · size M–L · deps: none

Builds on item 7. The in-place editable-cell path (`inPlace.table: "cells"`,
`table-cell-dom.ts` / `table-widget.ts`) does not run the embed pass. Decide
inline render vs. a clear "not here" fallback, then implement. (ADR-009 deferred.)

### 9 — ADR-007 seamless exceptions · size L · deps: none

Under `reveal: "never"`, three constructs still show raw source when the caret is
on their line: inline `$…$` math, fenced code, and `---` / `***` rules. Each
needs a source-edit affordance that isn't "reveal the markers" — the parallel of
the Stage-4 link editor. Touches the decoration core; land one construct per PR.

### 10 — (optional) split the files over 200 LOC · size L in aggregate · deps: none

Not consumer-facing — nobody downstream imports these. `inplace/table-widget.ts`
(~463), `inplace/theme.ts` (~456), `inplace/context-menu-actions.ts` (~428),
`toolbar/inline-ops.ts` (~330), `inplace/context-menu.ts` (~304),
`toolbar/commands.ts` (~297), and a few more. Split by responsibility, no
behaviour change. Do opportunistically alongside item 7–9 work that touches the
same file, rather than as a standalone push.
