# Changelog

Notable changes to Stylo. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project follows
[Semantic Versioning](https://semver.org/) from 1.0.0 onward.

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

### Known limitations

- Frontmatter is recognised but not parsed to key/value pairs; `preview` renders
  the block as `<pre>` at most.
- `@codemirror/*` are regular dependencies, not peer dependencies.
- The test suite runs in jsdom only.
- `inPlace` config is read once at mount; changing it needs a remount.

[0.1.0]: https://github.com/studiodamiro/stylo/releases/tag/v0.1.0
