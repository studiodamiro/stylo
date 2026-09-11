/**
 * Callout blockquotes (`> [!note]`). Split out of `theme-canvas.ts`, which
 * keeps the plain `.cm-inplace-quote` styling next to it.
 */

export const calloutTheme = {
  // A tinted box keyed by colour bucket; the head line carries a
  // `data-callout` label in place of the hidden `[!type]`. `--stylo-callout-accent`
  // is set per bucket and can be overridden per type.
  ".cm-inplace-callout": {
    borderLeft: "0.25rem solid var(--stylo-callout-accent, var(--stylo-border))",
    padding: "0 1rem",
    background:
      "color-mix(in srgb, var(--stylo-callout-accent, var(--stylo-border)) 10%, transparent)",
    color: "var(--stylo-text)",
  },
  // First / last line of the box carry the vertical breathing room and the
  // rounded outer corners (left stays a straight accent rule). Padding only —
  // `margin` on a `.cm-line` escapes CodeMirror's height map and clicks land on
  // the wrong line (2026-09-02 click-mapping).
  ".cm-inplace-callout-head": {
    paddingTop: "0.7em",
    borderTopRightRadius: "var(--stylo-radius)",
  },
  ".cm-inplace-callout-foot": {
    paddingBottom: "0.7em",
    borderBottomRightRadius: "var(--stylo-radius)",
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
    marginBottom: "0.2em",
    fontSize: "0.8em",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--stylo-callout-accent, var(--stylo-text-muted))",
  },
  // Caret in the block: the raw `> [!type]` shows, so drop the duplicate label.
  ".cm-inplace-callout-head[data-revealed]::before": { content: '""', display: "none" },
}
