import { StateEffect, StateField } from "@codemirror/state"

/**
 * Tracks whether the in-place right-click menu is open. The selection bar reads
 * it and steps aside while the menu is up, rather than the two floating popups
 * overlapping at the same `z-index` with no awareness of each other. The menu
 * controller (`menu-plugin.ts`) dispatches `setMenuOpen` on open and on every
 * dismissal path.
 */
export const setMenuOpen = StateEffect.define<boolean>()

export const menuOpenField = StateField.define<boolean>({
  create: () => false,
  update(open, tr) {
    for (const e of tr.effects) if (e.is(setMenuOpen)) open = e.value
    return open
  },
})
