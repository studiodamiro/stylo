/** GFM table rendering and the editable-cell surface. Split out of `theme.ts`. */

export const tableTheme = {
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
}
