import type { Extension } from "@codemirror/state"
import { inPlaceDecorations } from "./plugin"
import { inPlaceTheme } from "./theme"

/** The complete in-place canvas layer: decoration plugin plus display theme. */
export function inPlaceExtension(): Extension {
  return [inPlaceDecorations(), inPlaceTheme]
}
