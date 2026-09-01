---
title: "Project Genesis — Stylo extracted from Sympose"
created: 2026-09-01
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Project Genesis — Stylo extracted from Sympose

## Context

Sympose's `ui/` dashboard needs a real Markdown editor for the vault note panel
(`src/components/sympose/markdown-panel.tsx`), which is currently a static mock
with an inert toolbar. A hard requirement is LaTeX math support, since vault
notes carry `$…$` / `$$…$$` expressions.

The editor is not Sympose-specific — the same plain-text Markdown + math surface
is wanted across other projects. Rather than build it inside `ui/`, it is being
started as a standalone, reusable React component library.

## What happened

- Created a new repository, **Stylo**, at
  `git@github.com:studiodamiro/stylo.git`.
- Seeded it from Sympose:
  - `` rewritten for Stylo — kept the
    stack-agnostic execution guidelines (think before coding, simplicity &
    modular cleanliness, surgical changes & verification, the < 200 LOC ceiling),
    dropped the Python-only rules (TTFT SLA, path-traversal, mutexes, persona
    regex), and added a **plain-text-first architecture** section as the project
    north star. Documentation standards (dual Wiki + Journal/ADR system, Obsidian
    YAML frontmatter) carried over with tags renamespaced to `stylo/…`.
- Wrote the initial `README.md`: description, rationale, planned stack table, and
  a `<Stylo value onChange mode onWikiLinkClick />` API sketch.
- Added a Node/Vite `.gitignore`.
- Recorded [ADR-001](./2026-09-01_adr-001-editor-architecture.md): compose from
  primitives (CodeMirror 6 + `remark`/`rehype` + KaTeX), plain text is canonical,
  no WYSIWYG editor framework.
- Wrote `docs/wiki/index.md` and `docs/wiki/architecture/overview.md` (with a
  Mermaid data-flow diagram) and the `docs/PROJECT_JOURNAL.md` ADR index.

## State at end of session

Scaffold only — no build tooling, no `package.json`, no source. `main` tracks
`origin/main`.

## Next

- Scaffold the build: Vite library mode + TypeScript, `package.json` scripts
  (`dev`, `typecheck`, `test`, `build`), a playground entry.
- Add the composed dependencies and stand up the `source` view mode first.
- Custom `remark` wikilink plugin.
- `split` mode with shared scroll.
