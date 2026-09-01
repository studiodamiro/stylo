import { lazy } from "react"

/**
 * Preview pulls in react-markdown + remark/rehype + KaTeX. It is loaded only
 * when a rendered mode (`preview`, `split`) is actually used, so `mode="source"`
 * consumers never pay for it. Both callers share this one wrapper, so the render
 * pipeline stays a single lazy chunk.
 */
export const LazyPreview = lazy(async () => ({
  default: (await import("./Preview")).Preview,
}))
