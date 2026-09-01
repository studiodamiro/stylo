import { EditorView } from "@codemirror/view"

/**
 * Display styling for decorated nodes in the in-place canvas. Sizes are relative
 * to the editor font so they track the host's type scale; colour stays
 * inherited from the `--stylo-*` tokens.
 */
export const inPlaceTheme = EditorView.baseTheme({
  ".cm-inplace-heading": {
    fontWeight: "600",
    lineHeight: "1.25",
  },
  ".cm-inplace-h1": { fontSize: "1.6em" },
  ".cm-inplace-h2": { fontSize: "1.35em" },
  ".cm-inplace-h3": { fontSize: "1.15em" },
  ".cm-inplace-h4": { fontSize: "1em" },
  ".cm-inplace-h5": { fontSize: "0.9em" },
  ".cm-inplace-h6": { fontSize: "0.9em", color: "var(--stylo-text-muted)" },
})
