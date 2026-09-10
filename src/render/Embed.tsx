import { type ReactNode, useEffect, useState } from "react"
import type { EmbedSource, ResolveErrorInfo } from "../types"
import { peekEmbed, resolveEmbed } from "./embed-cache"

interface EmbedProps {
  /** The raw `![[ref]]` reference, trimmed. */
  reference: string
  source: EmbedSource
  /** Notified if `source` rejects; the literal fallback still renders. */
  onError?: (error: unknown, info: ResolveErrorInfo) => void
  /**
   * Render as phrasing content in a `<span>` (a `![[…]]` mid-sentence) rather
   * than the default block `<div>`. The host node should be inline in this mode.
   */
  inline?: boolean
}

type State = { status: "loading" | "error" } | { status: "ready"; node: ReactNode }

/**
 * Renders one `![[ref]]` embed. Resolves the reference through `embedSource` —
 * via a shared cache (`embed-cache.ts`), so an embed re-mounted by a scroll or a
 * `preview` re-render is not re-fetched — and drops the result into
 * `<div class="stylo-embed-content">`, or a `<span>` when `inline`. While it
 * resolves — and if it rejects, or resolves to `null` — the literal `![[ref]]`
 * text stands in, so a reference is never silently lost.
 */
export function Embed({ reference, source, onError, inline }: EmbedProps) {
  const [state, setState] = useState<State>(() => {
    const hit = peekEmbed(source, reference)
    return hit ? { status: "ready", node: hit.node } : { status: "loading" }
  })

  useEffect(() => {
    let live = true
    const hit = peekEmbed(source, reference)
    if (hit) {
      setState({ status: "ready", node: hit.node })
      return
    }
    setState({ status: "loading" })
    resolveEmbed(source, reference).then(
      (node) => live && setState({ status: "ready", node }),
      (error) => {
        onError?.(error, { source: "embedSource", input: reference })
        if (live) setState({ status: "error" })
      },
    )
    return () => {
      live = false
    }
  }, [reference, source, onError])

  const literal = `![[${reference}]]`
  if (state.status === "loading") return <span aria-busy="true">{literal}</span>
  if (state.status === "ready" && state.node != null) {
    return inline ? (
      <span className="stylo-embed-content stylo-embed-inline">{state.node}</span>
    ) : (
      <div className="stylo-embed-content">{state.node}</div>
    )
  }
  return <span>{literal}</span>
}
