/**
 * Right-click menu (`menu-plugin.ts` / `context-menu.ts`) — also the editable
 * table's structural menu (`table-gizmos.ts`), same shell. Split out of
 * `theme.ts`.
 */

export const menuTheme = {
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
    background: "var(--stylo-surface-floating, #fff)",
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
  // Active row uses `--stylo-accent` ("active / pressed states"), not
  // `--stylo-ring` — the focus-ring token stays a focus ring only, so a host can
  // restyle one without disturbing the other.
  ".cm-inplace-menu-item[data-active]": { color: "var(--stylo-accent)", fontWeight: "600" },
  ".cm-inplace-menu-item[data-active] svg": { color: "var(--stylo-accent)" },
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
    background: "var(--stylo-surface-floating, #fff)",
    outline: "none",
  },
  ".cm-inplace-menu-input:focus": { borderColor: "var(--stylo-ring)" },
}
