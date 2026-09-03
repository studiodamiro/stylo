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
  //
  // The horizontal gutter lives here, not on `.cm-line`. A `.cm-line` padding
  // insets its text but not a line background/border (CSS paints those across
  // the padding too) nor a block widget (a `block: true` replacement renders
  // outside `.cm-line`). So a boxed block — fenced code, the blockquote bar, a
  // rendered table, a `$$` math block — would otherwise bleed to the editor
  // frame. Padding on `.cm-content` holds every one of them off the edge.
  "& .cm-content": {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: "1.75",
    padding: "0.75rem",
  },
  "& .cm-line": { paddingLeft: "0", paddingRight: "0" },

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

  // Fenced / indented code block rows. The background runs the full line width
  // and the text is inset by `0.9rem`, mirroring the preview surface's `pre`
  // (`stylo.module.css`) so a block lines up with the prose column on both
  // edges. No horizontal margin — that inset the background and read as a
  // floating, too-narrow block against every other flush block.
  ".cm-inplace-mono": {
    fontFamily: MONO,
    fontSize: "0.9em",
    background: "color-mix(in srgb, var(--stylo-border) 35%, transparent)",
    padding: "0 0.9rem",
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
  // A Setext heading's `===` / `---` underline row, collapsed to nothing off
  // the caret so the heading reads as one line (the `---` text is also hidden).
  ".cm-inplace-setext-rule": { fontSize: "0", lineHeight: "0" },
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

  // Callout blockquotes (`> [!note]`). A tinted box keyed by colour bucket; the
  // head line carries a `data-callout` label in place of the hidden `[!type]`.
  // `--stylo-callout-accent` is set per bucket and can be overridden per type.
  ".cm-inplace-callout": {
    borderLeft: "0.25rem solid var(--stylo-callout-accent, var(--stylo-border))",
    paddingLeft: "1.75rem",
    background:
      "color-mix(in srgb, var(--stylo-callout-accent, var(--stylo-border)) 10%, transparent)",
    color: "var(--stylo-text)",
  },
  ".cm-inplace-callout-note": { "--stylo-callout-accent": "var(--stylo-callout-note, #3b82f6)" },
  ".cm-inplace-callout-tip": { "--stylo-callout-accent": "var(--stylo-callout-tip, #22c55e)" },
  ".cm-inplace-callout-warn": { "--stylo-callout-accent": "var(--stylo-callout-warn, #f59e0b)" },
  ".cm-inplace-callout-danger": {
    "--stylo-callout-accent": "var(--stylo-callout-danger, #ef4444)",
  },
  ".cm-inplace-callout-example": {
    "--stylo-callout-accent": "var(--stylo-callout-example, #a855f7)",
  },
  ".cm-inplace-callout-head::before": {
    content: "attr(data-callout)",
    display: "block",
    marginLeft: "-1.75rem",
    fontSize: "0.8em",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--stylo-callout-accent, var(--stylo-text-muted))",
  },

  ".cm-inplace-bullet": { color: "var(--stylo-text-muted)" },
  // Nested-list indent guides: `--sl-li-depth` 1px rules, one per level above
  // this line, spaced by an indent step and clipped to that width. Approximate
  // alignment — decorative depth cue, not a pixel-exact rail.
  ".cm-inplace-li": {
    backgroundImage:
      "repeating-linear-gradient(to right, var(--stylo-guide) 0 1px, transparent 1px 1.5em)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0.35em 0",
    backgroundSize: "calc(var(--sl-li-depth, 0) * 1.5em) 100%",
  },
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
    border: "1px solid var(--stylo-table-border)",
    background: "var(--stylo-table-header-bg)",
    fontWeight: "600",
  },
  ".cm-inplace-table td": {
    padding: "0.35em 0.6em",
    border: "1px solid var(--stylo-table-border)",
  },
  // Zebra striping — a no-op until the host sets `--stylo-table-stripe-bg`.
  ".cm-inplace-table tbody tr:nth-child(even) td": {
    background: "var(--stylo-table-stripe-bg)",
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
    // Reserve the right / bottom gutters the edge strips occupy. `border-collapse`
    // makes the browser ignore padding on the `<table>` itself, so without this
    // the wrapper is sized to the bare grid and the strips overflow it — the row
    // strip spilling into the block below. Padding (not margin) so CodeMirror's
    // height map still measures the widget correctly.
    padding: "0 calc(1.15em + 4px) calc(1.15em + 4px) 0",
  },
  ".cm-inplace-table-gizmos": {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
  },
  // right edge → add column; bottom edge → add row. Click anywhere along the
  // strip; it only shows itself (and its centred `+`) while the pointer is on it.
  // The clearance from the grid edge is set in `table-gizmos.ts` `layout()` so it
  // is identical on both strips; the tint matches the header-row fill.
  ".cm-inplace-tg-edge": {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    padding: "0",
    font: "inherit",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    opacity: "0",
    transition: "opacity 0.1s ease",
  },
  ".cm-inplace-tg-edge:hover": {
    opacity: "1",
    background: "color-mix(in srgb, var(--stylo-border) 30%, transparent)",
  },
  ".cm-inplace-tg-addcol": { width: "1.15em" },
  ".cm-inplace-tg-addrow": { height: "1.15em" },
  // A CSS-drawn cross, not a font glyph: a `+` character rides up toward the
  // font's math axis, so flex centring leaves it visibly high no matter how the
  // font size is tuned. Two `currentColor` bars positioned dead centre are exact
  // and still follow the hover colour change below.
  ".cm-inplace-tg-plus": {
    width: "0.7em",
    height: "0.7em",
    color: "var(--stylo-text-muted)",
    background:
      "linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat," +
      "linear-gradient(currentColor, currentColor) center / 2px 100% no-repeat",
    pointerEvents: "none",
  },
  ".cm-inplace-tg-edge:hover .cm-inplace-tg-plus": { color: "var(--stylo-text)" },

  // --- Right-click menu (menu-plugin.ts / context-menu.ts) ---
  // Also the editable table's structural menu (table-gizmos.ts) — same shell.
  // `.cm-inplace-menu` is a non-interactive full-viewport layer; each panel
  // inside it is a fixed-positioned popup.
  ".cm-inplace-menu": {
    position: "fixed",
    inset: "0",
    zIndex: "20",
    pointerEvents: "none",
  },
  ".cm-inplace-menu-panel": {
    position: "fixed",
    minWidth: "12em",
    padding: "0.25em",
    display: "flex",
    flexDirection: "column",
    pointerEvents: "auto",
    background: "var(--stylo-bg, #fff)",
    border: "1px solid var(--stylo-border)",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
    font: "inherit",
  },
  ".cm-inplace-menu-sep": {
    height: "1px",
    margin: "0.25em 0.3em",
    background: "var(--stylo-border)",
  },
  ".cm-inplace-menu-item": {
    all: "unset",
    display: "flex",
    alignItems: "center",
    gap: "0.55em",
    padding: "0.35em 0.6em",
    borderRadius: "4px",
    fontSize: "0.9em",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ".cm-inplace-menu-item svg": {
    width: "1em",
    height: "1em",
    flex: "0 0 auto",
    color: "var(--stylo-text-muted)",
  },
  ".cm-inplace-menu-item:hover:not(:disabled)": {
    background: "color-mix(in srgb, var(--stylo-border) 40%, transparent)",
  },
  ".cm-inplace-menu-item:disabled": { opacity: "0.4", cursor: "default" },
  ".cm-inplace-menu-item[data-active]": { color: "var(--stylo-ring)", fontWeight: "600" },
  ".cm-inplace-menu-item[data-active] svg": { color: "var(--stylo-ring)" },
  ".cm-inplace-menu-parent::after": {
    content: '"\\203A"',
    marginLeft: "auto",
    paddingLeft: "1.5em",
  },
  ".cm-inplace-menu-input": {
    display: "block",
    boxSizing: "border-box",
    width: "18em",
    maxWidth: "70vw",
    margin: "0.15em",
    padding: "0.45em 0.6em",
    border: "1px solid var(--stylo-text-muted)",
    borderRadius: "4px",
    fontSize: "0.9em",
    fontFamily: "inherit",
    lineHeight: "1.4",
    color: "var(--stylo-text)",
    background: "var(--stylo-bg, #fff)",
    outline: "none",
  },
  ".cm-inplace-menu-input:focus": { borderColor: "var(--stylo-ring)" },

  // --- Selection bar (selection-bar.ts) ---
  // `[hidden]` toggles visibility, not `display` — the bar stays laid out so
  // `getBoundingClientRect` can size it during the measure phase. It is
  // `position: fixed`, so an always-present hidden bar costs no document flow.
  ".cm-inplace-selbar": {
    position: "fixed",
    zIndex: "20",
    display: "flex",
    gap: "0.1em",
    padding: "0.2em",
    background: "var(--stylo-bg, #fff)",
    border: "1px solid var(--stylo-border)",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
  },
  ".cm-inplace-selbar[hidden]": { visibility: "hidden", pointerEvents: "none" },
  ".cm-inplace-selbar-btn": {
    all: "unset",
    display: "flex",
    padding: "0.3em",
    borderRadius: "4px",
    cursor: "pointer",
    color: "var(--stylo-text-muted)",
  },
  ".cm-inplace-selbar-btn svg": { width: "1.05em", height: "1.05em", display: "block" },
  ".cm-inplace-selbar-btn:hover": {
    background: "color-mix(in srgb, var(--stylo-border) 40%, transparent)",
    color: "var(--stylo-text)",
  },
  ".cm-inplace-selbar-btn[data-active]": {
    color: "var(--stylo-text)",
    background: "color-mix(in srgb, var(--stylo-border) 55%, transparent)",
  },

  // --- Link / wikilink hover bubble (link-hover.ts) ---
  ".cm-tooltip.cm-tooltip-hover:has(.cm-inplace-href-tip)": {
    border: "none",
    background: "transparent",
  },
  ".cm-inplace-href-tip": {
    maxWidth: "min(28em, 70vw)",
    padding: "0.3em 0.55em",
    borderRadius: "5px",
    background: "var(--stylo-bg, #fff)",
    border: "1px solid var(--stylo-border)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
    color: "var(--stylo-text-muted)",
    fontSize: "0.82em",
    lineHeight: "1.4",
    wordBreak: "break-all",
  },
})
