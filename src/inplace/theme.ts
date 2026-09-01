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

  ".cm-inplace-mono": {
    fontFamily: MONO,
    fontSize: "0.9em",
    background: "color-mix(in srgb, var(--stylo-border) 35%, transparent)",
    margin: "0 0.25rem",
    padding: "0 0.65rem",
  },
  ".cm-inplace-code-top": {
    marginTop: "0.5em",
    paddingTop: "0.7rem",
    borderTopLeftRadius: "var(--stylo-radius)",
    borderTopRightRadius: "var(--stylo-radius)",
  },
  ".cm-inplace-code-bottom": {
    marginBottom: "0.9em",
    paddingBottom: "0.7rem",
    borderBottomLeftRadius: "var(--stylo-radius)",
    borderBottomRightRadius: "var(--stylo-radius)",
  },
  ".cm-inplace-fence": { color: "var(--stylo-text-muted)" },
  ".cm-inplace-code-pad": { fontSize: "0", lineHeight: "0" },

  ".cm-inplace-link": {
    color: "var(--stylo-accent)",
    textDecoration: "underline",
    textUnderlineOffset: "0.15em",
    cursor: "pointer",
  },
  ".cm-inplace-wikilink": { textDecoration: "none" },

  ".cm-inplace-math-block": {
    display: "block",
    margin: "0.6em 0",
    textAlign: "center",
  },
  ".cm-inplace-math-block .katex-display": { margin: "0" },

  ".cm-inplace-hr": {
    display: "block",
    border: "none",
    borderTop: "1px solid var(--stylo-border)",
    margin: "0.5em 0",
  },
  ".cm-inplace-quote": {
    borderLeft: "3px solid var(--stylo-border)",
    color: "var(--stylo-text-muted)",
  },
  ".cm-inplace-bullet": { color: "var(--stylo-text-muted)" },
  ".cm-inplace-checkbox": {
    margin: "0 0.4em 0 0",
    verticalAlign: "middle",
    cursor: "pointer",
  },
  ".cm-inplace-frontmatter": {
    display: "inline-block",
    padding: "0.1em 0.5em",
    margin: "0.15em 0",
    fontSize: "0.8em",
    color: "var(--stylo-text-muted)",
    border: "1px solid var(--stylo-border)",
    borderRadius: "4px",
  },

  ".cm-inplace-table": {
    borderCollapse: "collapse",
    margin: "0.3em 0 0.9em",
    fontSize: "0.95em",
  },
  ".cm-inplace-table th": {
    padding: "0.35em 0.6em",
    border: "1px solid var(--stylo-border)",
    background: "color-mix(in srgb, var(--stylo-border) 30%, transparent)",
    fontWeight: "600",
  },
  ".cm-inplace-table td": {
    padding: "0.35em 0.6em",
    border: "1px solid var(--stylo-border)",
  },
})
