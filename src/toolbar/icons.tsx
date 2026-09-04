import type { ReactNode } from "react"
import type { ToolbarCommandId } from "../types"
import { ICON_PATHS } from "./icon-paths"

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
 * §4). Path data is shared with the in-place UI via `./icon-paths`. Headings
 * render as text so the level reads at a glance.
 */
export const DEFAULT_ICONS: Record<ToolbarCommandId, ReactNode> = {
  undo: <Svg d={ICON_PATHS.undo!} />,
  redo: <Svg d={ICON_PATHS.redo!} />,
  save: <Svg d={ICON_PATHS.save!} />,
  h1: <b aria-hidden="true">H1</b>,
  h2: <b aria-hidden="true">H2</b>,
  h3: <b aria-hidden="true">H3</b>,
  body: <Svg d={ICON_PATHS.body!} />,
  bold: <Svg d={ICON_PATHS.bold!} />,
  italic: <Svg d={ICON_PATHS.italic!} />,
  strike: <Svg d={ICON_PATHS.strike!} />,
  code: <Svg d={ICON_PATHS.code!} />,
  codeBlock: <Svg d={ICON_PATHS.codeBlock!} />,
  link: <Svg d={ICON_PATHS.link!} />,
  wikilink: <Svg d={ICON_PATHS.wikilink!} />,
  quote: <Svg d={ICON_PATHS.quote!} />,
  bulletList: <Svg d={ICON_PATHS.bulletList!} />,
  orderedList: <Svg d={ICON_PATHS.orderedList!} />,
  task: <Svg d={ICON_PATHS.task!} />,
  hr: <Svg d={ICON_PATHS.hr!} />,
  frontmatter: <code aria-hidden="true">fm</code>,
  table: <Svg d={ICON_PATHS.table!} />,
  math: <Svg d={ICON_PATHS.math!} />,
  mathBlock: <Svg d={ICON_PATHS.mathBlock!} />,
}
