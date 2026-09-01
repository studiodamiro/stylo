import { Prec, type Extension } from "@codemirror/state"
import { inPlaceDecorations } from "./plugin"
import { inPlaceTheme } from "./theme"

/**
 * The complete in-place canvas layer: decoration plugin plus display theme.
 *
 * The theme is raised with `Prec.high` so its `.cm-content` font rule overrides
 * the base editor theme (which sets the source surface to monospace) for
 * in-place editors only.
 */
export function inPlaceExtension(): Extension {
  return [inPlaceDecorations(), Prec.high(inPlaceTheme)]
}
