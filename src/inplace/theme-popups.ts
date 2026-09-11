/**
 * The selection bar (`selection-bar.ts`), its touch-target growth alongside
 * the right-click menu's, and the link / wikilink / math hover bubble
 * (`link-hover.ts`, `math-edit.ts`). Split out of `theme.ts`.
 */

export const popupsTheme = {
  // `[hidden]` toggles visibility, not `display` — the bar stays laid out so
  // `getBoundingClientRect` can size it during the measure phase. It is
  // `position: fixed`, so an always-present hidden bar costs no document flow.
  ".cm-inplace-selbar": {
    position: "fixed",
    zIndex: "20",
    display: "flex",
    gap: "0.1em",
    padding: "0.2em",
    background: "var(--stylo-surface-floating, #fff)",
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

  // When the primary pointer is a finger, the right-click menu, its URL input,
  // and the selection bar grow to a comfortable tap size. Automatic — this is
  // popup-internal sizing, not a layout change, so unlike `toolbar.sticky` it
  // needs no opt-in. Consumers still override via the `.cm-inplace-*` classes.
  // Menu rows use 9px of vertical padding (an ~18px gutter between labels) and
  // no `min-height` — a full 44px row spread the list out more than it earned.
  "@media (pointer: coarse)": {
    ".cm-inplace-menu-panel": { minWidth: "14em", padding: "0.25em" },
    ".cm-inplace-menu-item": { padding: "9px 0.75em", fontSize: "1em" },
    ".cm-inplace-menu-item svg": { width: "1.15em", height: "1.15em" },
    ".cm-inplace-menu-sep": { margin: "0.2em 0.3em" },
    ".cm-inplace-menu-input": { padding: "9px 0.75em", fontSize: "1em" },
    ".cm-inplace-selbar": { gap: "0.15em", padding: "0.25em" },
    ".cm-inplace-selbar-btn": { padding: "0.55em", minWidth: "44px", justifyContent: "center" },
    ".cm-inplace-selbar-btn svg": { width: "1.25em", height: "1.25em" },
  },

  // Link / wikilink hover bubble (link-hover.ts) and the math-widget hover
  // bubble (math-edit.ts) share this styling.
  ".cm-tooltip.cm-tooltip-hover:has(.cm-inplace-href-tip)": {
    border: "none",
    background: "transparent",
  },
  ".cm-inplace-href-tip": {
    maxWidth: "min(28em, 70vw)",
    padding: "0.3em 0.55em",
    borderRadius: "5px",
    background: "var(--stylo-surface-floating, #fff)",
    border: "1px solid var(--stylo-border)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
    color: "var(--stylo-text-muted)",
    fontSize: "0.82em",
    lineHeight: "1.4",
    wordBreak: "break-all",
  },
}
