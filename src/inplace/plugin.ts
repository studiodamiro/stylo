import type { Extension } from "@codemirror/state"
import { type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { buildDecorations } from "./decorate"

/**
 * Owns the in-place decoration set and rebuilds it when the document, the
 * viewport, or the selection changes. Selection is a trigger because the
 * cursor-reveal behaviour depends on where the caret sits.
 *
 * Exported (not just the factory) so tests can read the live `DecorationSet`
 * via `view.plugin(inPlacePlugin)`.
 */
export const inPlacePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

export function inPlaceDecorations(): Extension {
  return inPlacePlugin
}
