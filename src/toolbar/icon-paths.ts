/**
 * Single source of truth for the built-in glyphs: 24×24 stroke-path data,
 * segments joined by "|". Consumed by the React toolbar (`icons.tsx`), the
 * in-place selection bar, and the in-place right-click menu, so none of them
 * carries its own copy.
 */
export const ICON_PATHS: Record<string, string> = {
  undo: "M9 14 4 9l5-5|M4 9h11a5 5 0 0 1 0 10h-4",
  redo: "m15 14 5-5-5-5|M20 9H9a5 5 0 0 0 0 10h4",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z|M17 21v-8H7v8|M7 3v5h8",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7z|M7 12h7a3.5 3.5 0 0 1 0 7H7z",
  italic: "M19 5h-7|M12 19H5|M15 5l-4 14",
  strike: "M4 12h16|M8 8a4 3 0 0 1 4-3h1.5|M14 12a3 3 0 0 1 0 6h-2.5",
  code: "m16 18 6-6-6-6|M8 6l-6 6 6 6",
  codeBlock: "M4 4h16v16H4z|m10 10-2 2 2 2|m14 10 2 2-2 2",
  link: "M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 3l-1.5 1.5|M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21l1.5-1.5",
  wikilink: "M10 5H6v14h4|M18 5H14v14h4",
  quote: "M7 7H4v6h3l-2 4|M17 7h-3v6h3l-2 4",
  bulletList: "M9 6h11|M9 12h11|M9 18h11|M4.5 6h.01|M4.5 12h.01|M4.5 18h.01",
  orderedList: "M10 6h11|M10 12h11|M10 18h11|M4 6l1-.75V10|M4 18h2.5a1 1 0 0 0 .7-1.7L4 13.5h3",
  task: "m9 11 2.5 2.5L20 5|M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
  hr: "M4 12h4|M10 12h4|M16 12h4",
  table: "M4 5h16v14H4z|M4 10h16|M4 15h16|M10 5v14",
  math: "M19 5H7l5.5 7L7 19h12",
  mathBlock: "M4 4h16v16H4z|M15 8H9l4 4-4 4h6",
  // Menu-only glyphs (the toolbar renders these ids as text, or not at all).
  insert: "M12 5v14|M5 12h14",
  heading: "M6 4v16|M18 4v16|M6 12h12",
  format: "M4 20l6-15 6 15|M6.5 14h7|M4 22h16",
  paragraph: "M17 4H10a5 5 0 0 0 0 10h3|M13 4v16|M17 4v16",
  body: "M5 6h14|M5 12h14|M5 18h9",
  frontmatter: "M4 5h16v4H4z|M4 13h10|M4 17h10",
  cut: "M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z|M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z|M8.6 8.6 20 20|M8.6 15.4 20 4",
  copy: "M9 9h11v11H9z|M5 15H4V4h11v1",
  paste: "M9 3h6v4H9z|M7 5h10v16H7z",
}

const SVGNS = "http://www.w3.org/2000/svg"

/** Build a stroke `<svg>` for `d` (as an `ICON_PATHS` value) as detached DOM. */
export function iconSvg(doc: Document, d: string): SVGElement {
  const svg = doc.createElementNS(SVGNS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  for (const seg of d.split("|")) {
    const p = doc.createElementNS(SVGNS, "path")
    p.setAttribute("d", seg)
    svg.appendChild(p)
  }
  return svg
}
