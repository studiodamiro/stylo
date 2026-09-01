---
title: "ADR-002 — Editor UX, Customization API, and Design System"
created: 2026-09-01
type: adr
parent: index
tags:
  - stylo/architecture
  - engineering/adr
---

# ADR-002 — Editor UX, Customization API, and Design System

- **Status:** Accepted — amends
  [ADR-001](./2026-09-01_adr-001-editor-architecture.md) by promoting the
  `in-place` inline live-preview canvas to the default view and into
  first-release scope
- **Date:** 2026-09-01
- **Deciders:** damiro, Grace

---

## Context

Following the establishment of Stylo's plain-text architectural foundation in [ADR-001](./2026-09-01_adr-001-editor-architecture.md), requirements were refined for browser-based CMS projects and modern writing workflows. Authors require a friction-free, distraction-free writing experience (Notion-like in-place editing), while developers building CMS interfaces require granular control over toolbar capabilities, styling adoption, keyboard shortcuts, image handling, and optional end-user toolbar personalization.

We needed to resolve:

1. The primary editing UX model (in-place live preview vs. split view).
2. The developer configuration API for toolbars and overflow.
3. The selection interaction model (smart highlight tooltip).
4. The visual settings customizer model (draggable icons with magnetic docking).
5. Styling, theming, and backwards compatibility for npm consumers.
6. The icon system and extensibility.
7. Multi-author state boundaries and auto-save lifecycles.

---

## Decisions

The items below are split into what the **first release** commits to and what is
**deferred**. Every deferred item is additive, leaves the plain-text invariant
untouched, and must not gate v1.

### Accepted for the first release

#### 1. `in-place` canvas is the default view

- Stylo's default `mode` is an in-place editing canvas built on CodeMirror 6 view
  decorations. Math (`$…$`, `$$…$$`) and headings render live in the document.
- Clicking into a decorated element reveals its raw Markdown/LaTeX for editing;
  moving the cursor away re-decorates it.
- The Markdown string stays the canonical source of truth at all times. This is
  the amendment to ADR-001 recorded in the status line above.
- `source`, `preview`, and `split` remain available via `mode`.

#### 2. Declarative developer toolbar API

- The toolbar is configured with a single declarative prop; developers can lock
  it down or extend it:
  ```tsx
  toolbar={{
    left: ["undo", "redo", "|", "heading", "bold", "italic", "link", "image", "math"],
    right: ["saveStatus", "save"],
    headings: ["h1", "h2", "h3"], // or "dropdown" | "all"
    overflow: "wrap",             // "wrap" (multiline) | "collapse" (overflow into "…" menu)
  }}
  ```
- Granular heading lists constrain hierarchy without exposing unused H4–H6.

#### 3. Styling: CSS Modules + a small custom-property token set

- Internal UI (toolbar, menus, drawer) is styled with **CSS Modules**, compiled
  by the library build into a single static `dist/styles.css`. No Tailwind, no
  utility-class toolchain, no PostCSS plugin stack beyond what the bundler needs.
- Consumers import `@damiro/stylo/styles.css` once. It is framework-agnostic — plain CSS,
  Next.js, Astro, Vite, or any Tailwind version — because it ships as compiled
  CSS with locally-scoped class names that cannot collide with host styles.
- A **minimal** token set is exposed as CSS custom properties, covering only what
  the editor chrome needs:
  `--stylo-bg`, `--stylo-text`, `--stylo-text-muted`, `--stylo-border`,
  `--stylo-accent`, `--stylo-ring`, `--stylo-radius`.
  Values are plain (`--stylo-bg: #fff`), not HSL channel triplets, so a host sets
  them directly. Defaults follow shadcn/ui's neutral conventions — 4px spacing
  rhythm, `0.5rem` radius, 1px hairline borders, a visible focus ring, zinc/slate
  greys — as a **visual reference only**. No shadcn or Tailwind code is vendored.
- `peerDependencies`: React `>= 18.0.0` (React 19 included).

#### 4. Icons: inline SVG, no icon dependency

- The ~12 built-in toolbar glyphs ship as inline SVG paths inside the component.
  There is no `lucide-react` — or any icon package — in the dependency tree.
- Every icon is replaceable via the `icons` prop (Lucide, Tabler, Heroicons,
  Radix, or custom SVG components).

#### 5. Keyboard shortcuts

- `Cmd/Ctrl+B` bold, `Cmd/Ctrl+I` italic, `Cmd/Ctrl+K` link, `Cmd/Ctrl+S` save,
  `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` undo/redo, `Cmd/Ctrl+Alt+1/2/3` headings.

### Deferred (post-v1, additive)

- **`<StyloToolbarSettings />` visual customizer** — drag tools between an
  "Available" drawer and "Left"/"Right" magnetic docks; persist to `localStorage`
  or hand out via `onSettingsChange`. Requires an accessible keyboard fallback.
- **Context-aware selection tooltip** (`mode="tooltip" | "toolbar" | "both"`) — a
  floating bubble menu that inspects the CodeMirror Lezer node under the
  selection to show context-relevant actions (plain text vs. link vs. math) and
  active-toggle state.
- **Debounced auto-save hook** — `autoSave={{ enabled, intervalMs, onAutoSave }}`.
- **Richer in-place decorations** beyond math and headings (tables, callouts,
  embeds).
- **Real-time collaboration (CRDT)** — kept out of core to stay lightweight;
  single-author persistence is callback-based (`onChange`, `onSave`).

---

## Consequences

### Positive

- A Notion/Obsidian-class writing experience with no loss of Markdown fidelity.
- The v1 surface is small enough to build in the foundation-first order (plain
  editing surface → decorations → chrome) without a customization backlog
  blocking release.
- No styling or icon dependency reaches the consumer's bundle; one CSS import,
  framework-agnostic.
- Every deferred item is independently shippable.

### Costs / considerations

- CodeMirror 6 decoration logic needs careful test coverage so cursor navigation
  around math blocks and decorated widgets stays smooth.
- Hand-written CSS Modules trade some authoring speed for zero build-time
  dependency — acceptable at this surface size; revisit only if the UI grows
  substantially.
- The `icons` prop must be ergonomic enough that dropping in a full icon set is
  trivial, since the built-ins are intentionally minimal.

## Alternatives rejected

- **Tailwind v3 + PostCSS for internal styling.** A utility-class toolchain
  (config, `content` globs, purge step) is disproportionate for a small, bounded
  UI. CSS Modules produce the same static `dist/styles.css` and the same
  "consumer needs no Tailwind" guarantee with no build-time dependency. Tailwind
  and shadcn/ui's _visual conventions_ are kept as a reference; the tooling is
  not.
- **`lucide-react` (or any icon package) as a dependency.** A package for ~12
  glyphs is a cost on every consumer. Inline SVG paths plus the `icons` override
  prop cover it.
- **CSS-in-JS (styled-components / Emotion).** Runtime injection, SSR hydration
  friction, and an added dependency, for no gain over static CSS Modules.
- **Shipping the full shadcn/ui token set** (`--card`, `--popover`, `--muted`,
  `--destructive`, `--input`, …). More surface than the editor chrome needs; the
  exposed token list is deliberately held to seven.
