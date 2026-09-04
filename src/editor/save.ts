import { Facet } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

/**
 * The consumer's `onSave` handler, surfaced into editor state so the `Mod-s`
 * keymap and the toolbar's `save` command share one path. Absent when no
 * `onSave` prop is set — the `save` button then renders disabled and `Mod-s`
 * falls through to the browser.
 */
export const saveHandler = Facet.define<(value: string) => void, ((value: string) => void) | null>({
  combine: (values) => values[0] ?? null,
})

/** Run the registered save handler with the current document. `false` if none. */
export function runSave(view: EditorView): boolean {
  const handler = view.state.facet(saveHandler)
  if (!handler) return false
  handler(view.state.doc.toString())
  return true
}
