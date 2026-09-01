import { Prec, type Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import type { InPlaceConfig } from "../types"
import { inPlaceConfigFacet, resolveToggles } from "./config"
import { frontmatterField } from "./frontmatter"
import { blockMathField } from "./math"
import { inPlaceDecorations } from "./plugin"
import { tableField } from "./tables"
import { inPlaceTheme } from "./theme"

export interface InPlaceOptions {
  /** Fired when a collapsed `[[wikilink]]` is clicked in the canvas. */
  onWikiLinkClick?: (target: string) => void
  /** Which decoration types render; see ADR-005. Applied once, at construction. */
  inPlace?: InPlaceConfig
}

/**
 * Rendered widgets with no interior text position. A click on one (its body,
 * KaTeX internals, the empty parts of an `<hr>`) can leave the caret unplaced,
 * so nothing reveals — this hands it to the widget's edge instead. Everything
 * else, text and line padding alike, stays with CodeMirror.
 */
const REVEAL_WIDGET = ".cm-inplace-math, .cm-inplace-hr, .cm-inplace-table"

/**
 * The complete in-place canvas layer: decoration plugin, display theme, a
 * reveal-on-click fallback for rendered widgets, and a delegated click handler
 * for wikilinks.
 *
 * The theme is raised with `Prec.high` so its `.cm-content` font rule overrides
 * the base editor theme (which sets the source surface to monospace) for
 * in-place editors only.
 */
export function inPlaceExtension(opts: InPlaceOptions = {}): Extension {
  return [
    inPlaceConfigFacet.of(resolveToggles(opts.inPlace)),
    inPlaceDecorations(),
    blockMathField,
    frontmatterField,
    tableField,
    Prec.high(inPlaceTheme),
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const widget = (event.target as HTMLElement | null)?.closest<HTMLElement>(REVEAL_WIDGET)
        if (!widget) return false // text or padding — CodeMirror places the caret
        const pos = view.posAtDOM(widget)
        if (pos < 0) return false
        view.focus()
        view.dispatch({ selection: { anchor: pos } })
        return true
      },
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
