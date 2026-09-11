/**
 * Editable-table affordances: the edge `+` strips that add a row / column on
 * hover (`table-gizmos.ts`). Split out of `theme.ts`.
 */

export const tableGizmosTheme = {
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
  // No hover on a touch device — keep the strips faintly visible so "add row" /
  // "add column" stays discoverable. A tap still runs them at full opacity.
  "@media (hover: none)": {
    ".cm-inplace-tg-edge": { opacity: "0.5" },
  },
}
