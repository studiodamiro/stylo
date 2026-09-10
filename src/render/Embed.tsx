import { type ReactNode, useEffect, useState } from "react"
import type { EmbedSource } from "../types"

interface EmbedProps {
  /** The raw `![[ref]]` reference, trimmed. */
  reference: string
  source: EmbedSource
}

type State = { status: "loading" | "error" } | { status: "ready"; node: ReactNode }

/**
 * Renders one `![[ref]]` embed. Calls `embedSource(ref)`, awaits it if it is a
 * promise, and drops the result into `<div class="stylo-embed-content">`. While
 * it resolves — and if it rejects, or resolves to `null` — the literal
 * `![[ref]]` text stands in, so a reference is never silently lost.
 */
export function Embed({ reference, source }: EmbedProps) {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let live = true
    setState({ status: "loading" })
    Promise.resolve(source(reference)).then(
      (node) => live && setState({ status: "ready", node }),
      () => live && setState({ status: "error" }),
    )
    return () => {
      live = false
    }
  }, [reference, source])

  const literal = `![[${reference}]]`
  if (state.status === "loading") return <span aria-busy="true">{literal}</span>
  if (state.status === "ready" && state.node != null) {
    return <div className="stylo-embed-content">{state.node}</div>
  }
  return <span>{literal}</span>
}
