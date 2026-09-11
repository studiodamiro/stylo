import { WIKILINK_PATTERN } from "../wikilink"
import type { InlineStr } from "./inline-ops"

/** The `[[target|label]]` span of `text` covering `head`, or `null`. */
export function wikiLinkAtIn(
  text: string,
  head: number,
): { from: number; to: number; label: string } | null {
  for (const m of text.matchAll(WIKILINK_PATTERN)) {
    const from = m.index ?? 0
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, label: m[2] || m[1] || "" }
  }
  return null
}

/**
 * Like {@link wikiLinkAtIn} but also breaks out the target and its `[from, to)`
 * span within `text`, for editing just the `[[…]]` target in place.
 */
export function wikiLinkPartsIn(
  text: string,
  head: number,
): {
  from: number
  to: number
  target: string
  label: string
  targetFrom: number
  targetTo: number
} | null {
  for (const m of text.matchAll(WIKILINK_PATTERN)) {
    const from = m.index ?? 0
    const to = from + m[0].length
    if (head < from || head > to) continue
    const target = m[1] ?? ""
    const targetFrom = from + 2 // past `[[`
    return {
      from,
      to,
      target,
      label: m[2] ?? "",
      targetFrom,
      targetTo: targetFrom + target.length,
    }
  }
  return null
}

/** Toggle `[[target]]` around `[from, to)` of `text` — wrap, or unwrap to the display text. */
export function wikiLinkString(text: string, from: number, to: number): InlineStr {
  const hit = wikiLinkAtIn(text, from)
  if (hit) {
    return {
      text: text.slice(0, hit.from) + hit.label + text.slice(hit.to),
      from: hit.from,
      to: hit.from + hit.label.length,
    }
  }
  const target = text.slice(from, to) || "target"
  return {
    text: text.slice(0, from) + `[[${target}]]` + text.slice(to),
    from: from + 2,
    to: from + 2 + target.length,
  }
}
