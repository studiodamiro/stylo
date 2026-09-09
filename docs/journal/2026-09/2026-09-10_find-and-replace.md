---
title: "Find / replace — @codemirror/search wired in"
created: 2026-09-10
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Find / replace — `@codemirror/search` wired in

The integration audit listed in-note search as "a baseline editor expectation
Stylo simply omits — no `search` toolbar id, no `Mod-f` keymap." Unlike the
vault-aware gaps on that list (`[[` autocomplete, `![[embed]]`), this one needs
no knowledge of anything outside the document: `@codemirror/search` is an
official CodeMirror package that composes straight onto the existing editor.

## What was wired

`baseExtensions()` ([`src/editor/extensions.ts`](../../../src/editor/extensions.ts))
gained three things:

- `search({ top: true })` — the panel and its state field. Top-docked, the
  common editor placement.
- `keymap.of(searchKeymap)` — in-panel navigation: `Mod-g` / `Mod-Shift-g`
  next / previous, `Mod-Alt-g` replace, `Mod-Shift-l` select all matches,
  `Escape` close.

Opening on `Mod-f` comes from a new **`search` toolbar command** rather than
`searchKeymap`'s own binding, so the same path that binds `Mod-b` / `Mod-k` on
every surface (`markdownKeymap`, built from each command's `keys`) also binds
`Mod-f` — the panel opens whether or not the visible toolbar is mounted. The
command's `run` is just `openSearchPanel(view)`; focus lands in the panel field,
so unlike `save` / `undo` it does not call `view.focus()` afterward.

Because it all lives in `baseExtensions`, `source`, the `split` source pane, and
the `in-place` canvas get find / replace from one place. `preview` renders
through `react-markdown` with no CodeMirror surface, so it is untouched — no
guard needed.

## The `search` command id

Added to `BUILTIN_COMMANDS` next to `save`, with the same **opt-in** treatment:
not in `DEFAULT_TOOLBAR_ITEMS`, so a consumer adds `"search"` to `toolbar.items`
to get a button. No `isActive` (a panel being open is not a document state) and
no `disabled` (search is always valid). A magnifier glyph joins `ICON_PATHS` /
`DEFAULT_ICONS`.

## Styling

CodeMirror's default search panel ships gradient `.cm-button`s and a bare
textfield. `styloTheme` ([`src/editor/theme.ts`](../../../src/editor/theme.ts))
now overrides `.cm-panels`, `.cm-panel.cm-search`, its `.cm-textfield` /
`.cm-button`, and the `.cm-searchMatch` / `.cm-searchMatch-selected` highlights —
all from `--stylo-*` tokens, so the panel tracks the host palette in light and
dark like the rest of the chrome. The panel background uses
`--stylo-surface-floating` (the token added the same week), so it stays opaque
if the host sets `--stylo-bg: transparent`.

## Dependency

`@codemirror/search` is a regular `dependency`, not a tenth peer — see the
[ADR-002 §2 amendment](./2026-09-01_adr-002-editor-ux-and-customization.md) for
the reasoning (ADR-008's peer rule is about the CodeMirror core's weight and
shared `EditorState` identity; neither applies here). The build's
`/^@codemirror\//` external rule still catches it, so the bundle is unchanged
(`check:size` green) and npm dedupe resolves it against the host's single
CodeMirror copy.

## Files

- `src/editor/extensions.ts` — `search` + `searchKeymap` in `baseExtensions`.
- `src/toolbar/commands.ts` — the `search` command (`openSearchPanel`, `Mod-f`).
- `src/toolbar/icon-paths.ts`, `src/toolbar/icons.tsx` — magnifier glyph.
- `src/types.ts` — `"search"` in `ToolbarCommandId`.
- `src/editor/theme.ts` — search-panel and match-highlight styling.
- `test/search.test.tsx` — panel opens on `Mod-f` (source and in-place),
  `findNext` walks matches, `replaceAll` rewrites, `preview` is inert.
- `package.json` — `@codemirror/search` dependency.

## Log

- 2026-09-10 — find / replace landed across `source` / `split` / `in-place`;
  opt-in `search` toolbar id; panel restyled to the token set. `typecheck`,
  `test` (351 / 351), `build`, `check:size` (8 / 8), `check:theme` all green.
  Panel visuals still want a real-Chrome look against the token overrides.
