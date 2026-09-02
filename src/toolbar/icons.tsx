import type { ReactNode } from "react"
import type { ToolbarCommandId } from "../types"

/** One 24×24 stroke icon; `d` holds one or more paths joined by `|`. */
function Svg({ d }: { d: string }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.split("|").map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  )
}

/**
 * Built-in glyphs — the fallback when the consumer passes no `icons` override
 * for an id. Inline SVG only; no icon package in the dependency tree (ADR-002
 * §4). Headings render as text so the level reads at a glance.
 */
export const DEFAULT_ICONS: Record<ToolbarCommandId, ReactNode> = {
  undo: <Svg d="M9 14 4 9l5-5|M4 9h11a5 5 0 0 1 0 10h-4" />,
  redo: <Svg d="m15 14 5-5-5-5|M20 9H9a5 5 0 0 0 0 10h4" />,
  h1: <b aria-hidden="true">H1</b>,
  h2: <b aria-hidden="true">H2</b>,
  h3: <b aria-hidden="true">H3</b>,
  bold: <Svg d="M7 5h6a3.5 3.5 0 0 1 0 7H7z|M7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <Svg d="M19 5h-7|M12 19H5|M15 5l-4 14" />,
  strike: <Svg d="M4 12h16|M8 8a4 3 0 0 1 4-3h1.5|M14 12a3 3 0 0 1 0 6h-2.5" />,
  code: <Svg d="m16 18 6-6-6-6|M8 6l-6 6 6 6" />,
  codeBlock: <Svg d="M4 4h16v16H4z|m10 10-2 2 2 2|m14 10 2 2-2 2" />,
  link: (
    <Svg d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 3l-1.5 1.5|M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21l1.5-1.5" />
  ),
  quote: <Svg d="M7 7H4v6h3l-2 4|M17 7h-3v6h3l-2 4" />,
  bulletList: <Svg d="M9 6h11|M9 12h11|M9 18h11|M4.5 6h.01|M4.5 12h.01|M4.5 18h.01" />,
  orderedList: (
    <Svg d="M10 6h11|M10 12h11|M10 18h11|M4 6l1-.75V10|M4 18h2.5a1 1 0 0 0 .7-1.7L4 13.5h3" />
  ),
  task: <Svg d="m9 11 2.5 2.5L20 5|M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />,
  hr: <Svg d="M4 12h4|M10 12h4|M16 12h4" />,
  frontmatter: <code aria-hidden="true">fm</code>,
  math: <Svg d="M19 5H7l5.5 7L7 19h12" />,
  mathBlock: <Svg d="M4 4h16v16H4z|M15 8H9l4 4-4 4h6" />,
}
