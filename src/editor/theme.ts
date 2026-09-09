import { EditorView } from "@codemirror/view"

/** CodeMirror theme wired to the `--stylo-*` tokens so the host controls the palette. */
export const styloTheme = EditorView.theme({
  "&": {
    color: "var(--stylo-text)",
    backgroundColor: "var(--stylo-bg)",
    fontSize: "var(--stylo-font-size, 0.9375rem)",
  },
  ".cm-content": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
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
  // Overrides the library's default gradient buttons for Stylo's flat,
  // token-driven chrome. Docked at the top (see `extensions.ts`).
  ".cm-panels": {
    background: "var(--stylo-surface-floating, #fff)",
    color: "var(--stylo-text)",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--stylo-border)",
  },
  ".cm-panel.cm-search": {
    padding: "6px 8px",
    font: "inherit",
    fontSize: "0.8125rem",
  },
  ".cm-panel.cm-search label": {
    fontSize: "0.75rem",
    color: "var(--stylo-text-muted)",
  },
  ".cm-panel.cm-search .cm-textfield": {
    padding: "0.3em 0.5em",
    border: "1px solid var(--stylo-border)",
    borderRadius: "calc(var(--stylo-radius) - 3px)",
    background: "var(--stylo-bg)",
    color: "var(--stylo-text)",
    fontSize: "0.8125rem",
  },
  ".cm-panel.cm-search .cm-textfield:focus-visible": {
    outline: "2px solid var(--stylo-ring)",
    outlineOffset: "-1px",
  },
  ".cm-panel.cm-search .cm-button": {
    padding: "0.3em 0.65em",
    border: "1px solid var(--stylo-border)",
    borderRadius: "calc(var(--stylo-radius) - 3px)",
    background: "var(--stylo-bg)",
    backgroundImage: "none",
    color: "var(--stylo-text)",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  ".cm-panel.cm-search .cm-button:hover": {
    background: "color-mix(in srgb, var(--stylo-border) 45%, transparent)",
  },
  ".cm-panel.cm-search [name='close']": {
    color: "var(--stylo-text-muted)",
    fontSize: "1.1rem",
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
