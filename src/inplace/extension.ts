import { Prec, type Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { inPlaceDecorations } from "./plugin"
import { inPlaceTheme } from "./theme"

export interface InPlaceOptions {
  /** Fired when a collapsed `[[wikilink]]` is clicked in the canvas. */
  onWikiLinkClick?: (target: string) => void
}

/**
 * The complete in-place canvas layer: decoration plugin, display theme, and a
 * delegated click handler for wikilinks.
 *
 * The theme is raised with `Prec.high` so its `.cm-content` font rule overrides
 * the base editor theme (which sets the source surface to monospace) for
 * in-place editors only.
 */
export function inPlaceExtension(opts: InPlaceOptions = {}): Extension {
  return [
    inPlaceDecorations(),
    Prec.high(inPlaceTheme),
    EditorView.domEventHandlers({
      click(event) {
        if (!opts.onWikiLinkClick) return false
        const el = (event.target as HTMLElement | null)?.closest("[data-stylo-wikilink]")
        if (!el) return false
        opts.onWikiLinkClick(el.getAttribute("data-stylo-wikilink") ?? "")
        return false
      },
    }),
  ]
}
