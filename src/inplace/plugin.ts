import type { Extension } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"
import { buildDecorations } from "./decorate"

/**
 * Owns the in-place decoration set and rebuilds it when the document, the
 * viewport, or the selection changes. Selection is a trigger because the
 * cursor-reveal behaviour depends on where the caret sits.
 *
 * Also provides `EditorView.atomicRanges` covering only the widget replacements
 * (rendered math), so the caret steps over them instead of into hidden `$$`.
 *
 * Exported (not just the factory) so tests can read the live sets via
 * `view.plugin(inPlacePlugin)`.
 */
export const inPlacePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    atomic: DecorationSet

    constructor(view: EditorView) {
      const built = buildDecorations(view)
      this.decorations = built.decorations
      this.atomic = built.atomic
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        const built = buildDecorations(update.view)
        this.decorations = built.decorations
        this.atomic = built.atomic
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
  },
)

export function inPlaceDecorations(): Extension {
  return inPlacePlugin
}
