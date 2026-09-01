import { EditorView } from "@codemirror/view"

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

/**
 * Display styling for the in-place canvas. Scoped to editors that include this
 * extension (via `EditorView.theme`), so `source` mode is untouched. Sizes are
 * relative to the editor font so they track the host's type scale; colour stays
 * inherited from the `--stylo-*` tokens.
 */
export const inPlaceTheme = EditorView.theme({
  // The canvas reads as prose, not source. Code spans opt back into monospace.
  "& .cm-content": {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: "1.6",
  },

  ".cm-inplace-heading": { fontWeight: "600", lineHeight: "1.25" },
  ".cm-inplace-h1": { fontSize: "1.6em" },
  ".cm-inplace-h2": { fontSize: "1.35em" },
  ".cm-inplace-h3": { fontSize: "1.15em" },
  ".cm-inplace-h4": { fontSize: "1em" },
  ".cm-inplace-h5": { fontSize: "0.9em" },
  ".cm-inplace-h6": { fontSize: "0.9em", color: "var(--stylo-text-muted)" },

  ".cm-inplace-strong": { fontWeight: "700" },
  ".cm-inplace-em": { fontStyle: "italic" },
  ".cm-inplace-strike": { textDecoration: "line-through" },
  ".cm-inplace-code": {
    fontFamily: MONO,
    fontSize: "0.9em",
    padding: "0.1em 0.35em",
    borderRadius: "3px",
    background: "color-mix(in srgb, var(--stylo-border) 45%, transparent)",
  },

  ".cm-inplace-mono": { fontFamily: MONO },

  ".cm-inplace-link": {
    color: "var(--stylo-accent)",
    textDecoration: "underline",
    textUnderlineOffset: "0.15em",
    cursor: "pointer",
  },
  ".cm-inplace-wikilink": { textDecoration: "none" },
})
