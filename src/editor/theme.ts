import { EditorView } from "@codemirror/view"

/** CodeMirror theme wired to the `--stylo-*` tokens so the host controls the palette. */
export const styloTheme = EditorView.theme({
  "&": {
    color: "var(--stylo-text)",
    backgroundColor: "var(--stylo-bg)",
    fontSize: "var(--stylo-font-size, 0.9375rem)",
  },
  ".cm-content": {
    fontFamily:
      "var(--stylo-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)",
    padding: "0.75rem 0",
    caretColor: "var(--stylo-text)",
  },
  ".cm-line": {
    padding: "0 0.75rem",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--stylo-text)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--stylo-accent) 15%, transparent)",
  },
  ".cm-placeholder": {
    color: "var(--stylo-text-muted)",
  },
  ".cm-gutters": {
    display: "none",
  },

  // --- Find / replace panel (@codemirror/search) ---
  // The library hands us a fixed DOM (find field, next/prev/all, three
  // checkbox labels, then — unless read-only — a `<br>` and the replace row)
  // with no host hook to reshape it, so this reorders it visually with flex
  // `order` onto one toolbar-height row: find | next/prev/all | replace |
  // replace/replace all | match case/regexp/by word | close. Docked at the
  // top (see `extensions.ts`), styled to read as one more row of the
  // existing toolbar rather than a separate floating card. `order` is a
  // paint-order-only reshuffle — Tab still follows the library's DOM order
  // (find, next, prev, all, case, re, word, replace, replace, replace all,
  // close) rather than the visual left-to-right one.
  ".cm-panels": {
    color: "var(--stylo-text)",
  },
  ".cm-panels.cm-panels-top": {
    background: "var(--stylo-bg)",
  },
  ".cm-panel.cm-search": {
    "--h": "32px",
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: "4px",
    height: "var(--h)",
    boxSizing: "border-box",
    padding: "0 8px",
    overflowX: "auto",
    overflowY: "hidden",
    font: "inherit",
    fontSize: "0.75rem",
    borderBottom: "1px solid var(--stylo-border)",
    animation: "stylo-search-slide-in 0.16s ease-out",
  },
  ".cm-panel.cm-search.cm-search-closing": {
    animation: "stylo-search-slide-out 0.16s ease-in forwards",
  },
  "@keyframes stylo-search-slide-in": {
    from: { height: "0px" },
    to: { height: "var(--h)" },
  },
  "@keyframes stylo-search-slide-out": {
    from: { height: "var(--h)" },
    to: { height: "0px" },
  },
  ".cm-panel.cm-search br": {
    display: "none",
  },
  ".cm-panel.cm-search label": {
    order: "9",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    whiteSpace: "nowrap",
    fontSize: "0.6875rem",
    color: "var(--stylo-text-muted)",
    flex: "0 0 auto",
  },
  ".cm-panel.cm-search .cm-textfield": {
    order: "1",
    flex: "1 1 90px",
    minWidth: "60px",
    padding: "0.2em 0.4em",
    border: "1px solid var(--stylo-border)",
    borderRadius: "calc(var(--stylo-radius) - 3px)",
    background: "var(--stylo-bg)",
    color: "var(--stylo-text)",
    fontSize: "0.75rem",
  },
  ".cm-panel.cm-search .cm-textfield:focus-visible": {
    outline: "2px solid var(--stylo-ring)",
    outlineOffset: "-1px",
  },
  // Text-only, no borders — mirrors `.toolbarButton` so the row stays
  // borderless and short enough to fit one line at toolbar height.
  ".cm-panel.cm-search .cm-button": {
    flex: "0 0 auto",
    padding: "0.15em 0.4em",
    border: "0",
    borderRadius: "calc(var(--stylo-radius) - 3px)",
    background: "none",
    backgroundImage: "none",
    color: "var(--stylo-text-muted)",
    fontSize: "0.6875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  ".cm-panel.cm-search .cm-button:hover": {
    background: "color-mix(in srgb, var(--stylo-border) 45%, transparent)",
    color: "var(--stylo-text)",
  },
  ".cm-panel.cm-search button[name='next']": { order: "2" },
  ".cm-panel.cm-search button[name='prev']": { order: "3" },
  ".cm-panel.cm-search button[name='select']": { order: "4" },
  ".cm-panel.cm-search input[name='replace']": {
    order: "6",
    marginLeft: "6px",
    paddingLeft: "10px",
    borderLeft: "1px solid var(--stylo-border)",
    borderRadius: "0",
  },
  ".cm-panel.cm-search button[name='replace']": { order: "7" },
  ".cm-panel.cm-search button[name='replaceAll']": { order: "8" },
  ".cm-panel.cm-search [name='close']": {
    order: "12",
    marginLeft: "auto",
    color: "var(--stylo-text-muted)",
    fontSize: "0.9rem",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--stylo-ring) 35%, transparent)",
    borderRadius: "2px",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--stylo-ring) 70%, transparent)",
    outline: "1px solid var(--stylo-ring)",
  },
})
