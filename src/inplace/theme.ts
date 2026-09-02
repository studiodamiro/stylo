import { EditorView } from "@codemirror/view"

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

/**
 * Display styling for the in-place canvas. Scoped to editors that include this
 * extension (via `EditorView.theme`), so `source` mode is untouched. Sizes are
 * relative to the editor font so they track the host's type scale; colour stays
 * inherited from the `--stylo-*` tokens.
 *
 * Vertical rhythm mirrors the `preview` surface, which follows Tailwind's
 * `prose` scale (reference only, no plugin). The match is approximate here: a
 * `.cm-line` cannot take a `margin` without drifting click-to-position (see the
 * 2026-09-02 click-mapping note), and a blank source line already supplies most
 * of the inter-block gap, so heading `padding-top` is trimmed accordingly.
 */
export const inPlaceTheme = EditorView.theme({
  // The canvas reads as prose, not source. Code spans opt back into monospace.
  "& .cm-content": {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: "1.75",
  },

  ".cm-inplace-heading": { fontWeight: "600" },
  ".cm-inplace-h1": { fontSize: "2.25em", lineHeight: "1.1111111", paddingTop: "0.35em" },
  ".cm-inplace-h2": { fontSize: "1.5em", lineHeight: "1.3333333", paddingTop: "0.7em" },
  ".cm-inplace-h3": { fontSize: "1.25em", lineHeight: "1.6", paddingTop: "0.6em" },
  ".cm-inplace-h4": { fontSize: "1em", lineHeight: "1.5", paddingTop: "0.5em" },
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
  // Vertical spacing is padding, never margin, on anything CodeMirror measures
  // for its height map (`.cm-line` decorations, block/inline widgets): margin
  // sits outside the border box CM measures, so it drifts click-to-position for
  // every line below. Applies to the block, the rule, the table, and the math
  // block too.
  ".cm-inplace-code-top": {
    paddingTop: "0.7rem",
    borderTopLeftRadius: "var(--stylo-radius)",
    borderTopRightRadius: "var(--stylo-radius)",
  },
  ".cm-inplace-code-bottom": {
    paddingBottom: "0.7rem",
    borderBottomLeftRadius: "var(--stylo-radius)",
    borderBottomRightRadius: "var(--stylo-radius)",
  },
  ".cm-inplace-fence": { color: "var(--stylo-text-muted)" },
  // Off-caret fence row: no text, no height — the container is padding + code.
  ".cm-inplace-code-pad": { fontSize: "0", lineHeight: "0" },

  // Links read by colour, not underline (a standard link blue via the token).
  ".cm-inplace-link": {
    color: "var(--stylo-link)",
    textDecoration: "none",
    cursor: "pointer",
  },
  ".cm-inplace-wikilink": { color: "var(--stylo-link)" },

  ".cm-inplace-math-block": {
    display: "block",
    padding: "0.9em 0",
    textAlign: "center",
  },
  ".cm-inplace-math-block .katex-display": { margin: "0" },

  // The `---` line's own text row is zeroed (same recipe as the fenced-code
  // fence rows) so it does not stack under the widget's height — that stacking
  // was the extra space above and below the rule.
  ".cm-inplace-hr-line": { fontSize: "0", lineHeight: "0" },
  ".cm-inplace-hr": {
    display: "block",
    // ~one text row, so the rule renders in the `---`'s own footprint with no
    // extra space and no shift when the caret enters (Obsidian's behaviour).
    // `rem` not `em` because the line's font-size is zeroed above. No margin,
    // so CodeMirror's height map measures it right (2026-09-02 click-mapping).
    height: "1.6rem",
    margin: "0",
    border: "none",
    // A 1px hairline painted at the row's centre line.
    background:
      "linear-gradient(var(--stylo-border), var(--stylo-border)) left center / 100% 1px no-repeat",
  },
  ".cm-inplace-quote": {
    borderLeft: "0.25rem solid var(--stylo-border)",
    paddingLeft: "1.75rem",
    color: "var(--stylo-text-muted)",
  },
  ".cm-inplace-bullet": { color: "var(--stylo-text-muted)" },
  ".cm-inplace-checkbox": {
    margin: "0 0.4em 0 0",
    verticalAlign: "middle",
    cursor: "pointer",
  },
  ".cm-inplace-fm": {
    fontFamily: MONO,
    fontSize: "0.85em",
    color: "var(--stylo-text-muted)",
  },
  ".cm-inplace-fm-first::before": {
    content: '"Frontmatter"',
    marginRight: "0.6em",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "0.8rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--stylo-text-muted)",
  },

  ".cm-inplace-table": {
    borderCollapse: "collapse",
    padding: "1em 0 1.4em",
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

  ".cm-inplace-table-edit .cm-inplace-tcell": {
    minWidth: "3em",
    cursor: "text",
    outline: "none",
  },
  ".cm-inplace-table-edit .cm-inplace-tcell:focus": {
    boxShadow: "inset 0 0 0 2px var(--stylo-ring)",
  },

  // --- editable-table affordances: edge `+` (hover) and a right-click menu ---
  ".cm-inplace-table-wrap": {
    position: "relative",
    display: "inline-block",
    maxWidth: "100%",
  },
  ".cm-inplace-table-gizmos": {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
  },
  ".cm-inplace-tg-add": {
    position: "absolute",
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.15em",
    height: "1.15em",
    padding: "0",
    font: "inherit",
    fontSize: "0.85em",
    lineHeight: "1",
    color: "var(--stylo-text-muted)",
    background: "color-mix(in srgb, var(--stylo-border) 22%, transparent)",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    opacity: "0",
    transition: "opacity 0.12s ease",
  },
  ".cm-inplace-table-wrap:hover .cm-inplace-tg-add": { opacity: "1" },
  ".cm-inplace-tg-add:hover": {
    color: "var(--stylo-text)",
    background: "color-mix(in srgb, var(--stylo-border) 45%, transparent)",
  },
  ".cm-inplace-tg-addcol": { transform: "translate(5px, -50%)" },
  ".cm-inplace-tg-addrow": { transform: "translate(-50%, 5px)" },
  ".cm-inplace-table-menu": {
    position: "absolute",
    zIndex: "5",
    minWidth: "11em",
    padding: "0.25em",
    flexDirection: "column",
    pointerEvents: "auto",
    background: "var(--stylo-bg, #fff)",
    border: "1px solid var(--stylo-border)",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
  },
  ".cm-inplace-table-menu:not([hidden])": { display: "flex" },
  ".cm-inplace-table-menu[hidden]": { display: "none" },
  ".cm-inplace-tm-sep": {
    height: "1px",
    margin: "0.25em 0.3em",
    background: "var(--stylo-border)",
  },
  ".cm-inplace-tm-item": {
    all: "unset",
    padding: "0.35em 0.6em",
    borderRadius: "4px",
    fontSize: "0.9em",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ".cm-inplace-tm-item:hover": {
    background: "color-mix(in srgb, var(--stylo-border) 40%, transparent)",
  },
  ".cm-inplace-tm-item[data-active]": { color: "var(--stylo-ring)", fontWeight: "600" },
})
