# Changelog

Notable changes to Stylo. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project follows
[Semantic Versioning](https://semver.org/) from 1.0.0 onward.

## [Unreleased]

### Added

- Toolbar extensibility. `toolbar.items` now accepts `ToolbarCustomItem` objects
  (`{ id, title, icon, run, isActive?, disabled? }`) mixed in with the built-in
  ids — a consumer's own button, run against the live view, refreshed on the
  same events as the built-ins. New `toolbar.render` slot wraps or replaces the
  rendered bar. Every toolbar button now carries a `data-command="<id>"`
  attribute. Custom items have no keyboard-shortcut field yet — bind against
  `getView()`. ADR-002 §2 amendment.
- `underline` toolbar command — wraps the selection in a raw `<u>…</u>` HTML
  pair (Markdown has no underline), bound to `Mod-u`. Not in the default bar;
  add `"underline"` to `toolbar.items` to show the button. Renders underlined
  wherever the host renders inline HTML; Stylo's bundled `preview` does not.

### Changed

- **BREAKING:** `@codemirror/*` and `@lezer/common` / `@lezer/highlight` are now
  `peerDependencies` rather than bundled dependencies, and are externalised from
  the build (ADR-008). The host installs one copy of CodeMirror and Stylo shares
  it, so `EditorState`, facets, and the syntax tree keep a single identity
  across the host and the editor — `getView()`, extra extensions, and host-side
  `syntaxTree` reads all line up. Install the packages alongside Stylo; see the
  README. Drops roughly 190&nbsp;kB gzipped from the bundle, and the `dist/`
  `codemirror` chunk with it.

## [0.1.0] - 2026-09-04

First versioned, installable release. Marks the point the library became
consumable from git.

### Added

- `<Stylo>` with four modes: `in-place` (default live decoration canvas),
  `source`, `preview`, `split`.
- In-place canvas: caret-reveal and always-hidden marker modes, right-click
  context menu, floating selection bar, autoformat-on-type, interactive table
  editing, callouts, and per-construct decoration toggles.
- Formatting toolbar with configurable, orderable built-in commands and
  per-command icon overrides via the `icons` prop.
- `[[wikilink]]` support with an `onWikiLinkClick` callback; `onLinkClick` for
  standard links.
- `onFrontmatter(raw)` callback (fires on mount and on change) and a
  `splitFrontmatter(md)` export. Stylo bundles no YAML parser — the host parses
  the raw block.
- `onSave` prop: `Mod-s` on any editing surface calls it with the full document
  and suppresses the browser's save dialog. An opt-in `save` toolbar id runs the
  same path; it is not in the default bar and stays disabled until `onSave` is
  wired. Auto-save stays a consumer concern — see the wiki guide.
- Imperative handle on a `ref` to `<Stylo>` — `focus()`, `scrollToHeading()`,
  `insertAtCursor()`, and `getView()` for direct `EditorView` access.
- Dark palette in `tokens.css`, triggered by a `.dark` / `[data-theme="dark"]`
  ancestor; `color-scheme` set on both themes.
- KaTeX rendering for `$…$` and `$$…$$`; the stylesheet ships separately as
  `@damiro/stylo/katex.css`.
- Opt-in fenced-code syntax highlighting via `codeLanguages`.
- `--stylo-*` CSS custom properties for theming, light and dark.
- `prepare` script, so the bundle builds itself on `npm install` from git.
- `manualChunks` so the built vendor chunks are named `codemirror`, `markdown`,
  and `katex` rather than after arbitrary internal modules.
- CI guards: `check:theme` (every `--stylo-*` colour has a light and a dark
  value) and `check:size` (per-chunk gzip budgets). CI also runs a React 18 and
  a TypeScript 6 job against the peer/consumer floor.

### Known limitations

- No built-in YAML parsing or rendered "properties" panel; `onFrontmatter` hands
  over the raw block and the host parses it.
- `@codemirror/*` are regular dependencies, not peer dependencies.
- The test suite runs in jsdom only.
- `inPlace` config is read once at mount; changing it needs a remount.

[0.1.0]: https://github.com/studiodamiro/stylo/releases/tag/v0.1.0
