import { EditorView } from "@codemirror/view"

/** CodeMirror theme wired to the `--stylo-*` tokens so the host controls the palette. */
export const styloTheme = EditorView.theme({
  "&": {
    color: "var(--stylo-text)",
    backgroundColor: "var(--stylo-bg)",
    fontSize: "0.9375rem",
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
})
