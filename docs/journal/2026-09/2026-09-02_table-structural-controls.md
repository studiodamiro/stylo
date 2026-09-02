---
title: "Structural controls on the editable table"
created: 2026-09-02
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Structural controls on the editable table

## Context

`inPlace.table: "cells"` could edit cell text and append a row with Tab / Enter,
but not restructure: no add / remove column, no remove row, no alignment. That
was the last deferred item in
[ADR-006](./2026-09-02_adr-006-interactive-table-editing.md); this closes it, so
`"cells"` mode is now a complete table editor.

## What was built

**Hover affordances**, Notion / Obsidian style. The widget's `toDOM` now returns
a positioned `<div class="cm-inplace-table-wrap">` holding the `<table>` and an
overlay layer:

- a `+` on the **right edge** (append column) and the **bottom edge** (append row);
- a `⋯` **handle** centred on every column header and every row, opening a small
  menu — columns: _insert left / right_, _delete column_, _align left / center /
  right_; rows: _insert above / below_, _delete row_.

Handles are re-placed from the live `<table>` geometry (`getBoundingClientRect`)
after every render and on `mouseenter`; the layer is `contenteditable="false"`
and only its buttons take pointer events, so a click _between_ handles still
lands in a cell. The menu sits outside the hover-gated opacity so it survives the
pointer leaving the table while it is open. Every element carries a stable class
(`cm-inplace-tg-*`, `cm-inplace-table-menu`, `cm-inplace-tm-item`) for consumer
restyling.

**`src/inplace/table-structure.ts`** (new) — the pure grid mutations on
`{ rows, aligns }`: `insertColumn` / `deleteColumn` / `insertRow` / `deleteRow` /
`setAlign`. Each keeps the model well-formed — always a header, ≥ 1 body row, ≥ 1
column; out-of-range indices clamp.

**`src/inplace/table-gizmos.ts`** (new) — builds the overlay DOM and the menus.
It takes a `GizmoHost` (`dims()` for the current shape, `run(op)` to apply a
`StructOp`); all label / enable logic lives here, all model mutation in the
widget.

**`src/inplace/table-widget.ts`** — `renderCells()` (extracted from `toDOM`)
rebuilds `<thead>`/`<tbody>` from the model; `runOp` applies a `StructOp` via the
pure functions, re-renders, restores focus to a sensible cell, and calls the
existing `sync` to reserialise. `appendRow` (Tab / Enter) now routes through the
same path.

## Trade-offs

- `table-widget.ts` is ~350 lines and `theme.ts` ~220 — both over the 200 target.
  The widget is one cohesive stateful DOM controller (the pure grid ops and the
  gizmo DOM are already split out); `theme.ts` is a flat style map. Accepted, as
  the [interactive-cells note](./2026-09-02_interactive-table-cells.md) already
  records for the widget.
- Handle positions are computed imperatively rather than via CSS anchor
  positioning (not yet baseline). Recompute is cheap — tables are small and only
  re-laid-out on a structural edit or hover.
- No drag-to-reorder rows / columns, and no multi-cell selection. Separate, later.

## Fixes after the first hands-on pass

- The `.cm-inplace-table-menu` rule set `display: flex`, which outranks the UA
  `[hidden]` rule — so an empty menu box was always painted at the overlay's
  top-left, over the header row. It swallowed the first click on anything beneath
  it, which is why "add row / column" and the inline-code / math buttons seemed
  to need a second click, and why the menu "wouldn't leave". Now gated on
  `:not([hidden])` / `[hidden]`.
- Handles were positioned against the table's border box, which carries the
  `1em / 1.4em` vertical padding, so they floated off the grid. `layout()` now
  measures the first / last `<tr>` and the header cells and places the `+`
  buttons too; the gizmo layer is `inset: 0`. Handles sit on the outer edge,
  centred on their column / row.

## Verification

`typecheck`, 151 Vitest tests (7 new in `test/table-structure.test.ts` for the
pure ops, 6 new in `test/table-interactive.test.tsx` — the edge `+` buttons
appending, a column menu deleting and writing `:-:` into the delimiter, a body
row menu deleting while the header handle offers only _insert below_, and the
menu staying hidden until opened then closing on an outside click), `build`,
`format:check`. Confirmed in a real Chrome against the playground: the handles
sit on the grid edges, `+` appends on a single click, the column menu re-aligns
and deletes, the row menu deletes, the menu closes on an outside click, inline
code / math wrap a cell selection first try, and every change round-trips through
`serializeGrid` with alignment preserved.
