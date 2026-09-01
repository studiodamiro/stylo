import { lazy } from "react"

/**
 * The in-place canvas carries the decoration plugin (and, in later increments,
 * its KaTeX widgets). It loads only when `mode` resolves to `in-place`, so
 * `source` consumers never fetch it.
 */
export const LazyInPlaceView = lazy(async () => ({
  default: (await import("./InPlaceView")).InPlaceView,
}))
