import katex from "katex"
import { WIKILINK_PATTERN } from "../wikilink"

/**
 * Render a single line of inline Markdown to DOM nodes — the subset that can
 * appear in a table cell: `` `code` ``, `$math$`, `[[wiki]]`, `[text](url)`,
 * `***both***`, `**bold**`, `*em*`, `~~strike~~`. Block constructs are out of
 * scope (a cell is one line). Reuses the `.cm-inplace-*` classes so cell text
 * matches the rest of the canvas, and tags wikilinks with `data-stylo-wikilink`
 * so the existing delegated click handler picks them up.
 *
 * `code` and `math` win first and keep their contents literal; everything else
 * recurses so `**a `code` b**` styles the bold and the code.
 */
export function renderInline(text: string): DocumentFragment {
  const frag = document.createDocumentFragment()
  fill(frag, text)
  return frag
}

interface Rule {
  re: RegExp
  build: (m: RegExpMatchArray) => Node
}

const RULES: Rule[] = [
  {
    re: /`([^`\n]+)`/,
    build: (m) => el("code", "cm-inplace-code", document.createTextNode(m[1]!)),
  },
  {
    // inline math: no digit/`$` touching the fences, no space just inside them
    re: /(?<![\d$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\d$])/,
    build: (m) => {
      const span = el("span", "cm-inplace-math")
      katex.render(m[1]!, span as HTMLElement, { throwOnError: false })
      return span
    },
  },
  {
    // a non-global copy — the shared pattern carries `g` and its own lastIndex
    re: new RegExp(WIKILINK_PATTERN.source),
    build: (m) => {
      const span = el("span", "cm-inplace-wikilink", document.createTextNode(m[2] || m[1] || ""))
      ;(span as HTMLElement).dataset.styloWikilink = m[1] ?? ""
      return span
    },
  },
  {
    re: /\[([^\]\n]*)\]\(([^)\n]*)\)/,
    build: (m) => {
      const a = el("a", "cm-inplace-link") as HTMLAnchorElement
      a.href = m[2] ?? ""
      a.append(inlineFrag(m[1] ?? ""))
      return a
    },
  },
  {
    re: /\*\*\*([^*\n]+?)\*\*\*/,
    build: (m) => el("strong", "cm-inplace-strong", el("em", "cm-inplace-em", inlineFrag(m[1]!))),
  },
  {
    re: /\*\*([^\n]+?)\*\*/,
    build: (m) => el("strong", "cm-inplace-strong", inlineFrag(m[1]!)),
  },
  {
    re: /~~([^\n]+?)~~/,
    build: (m) => el("span", "cm-inplace-strike", inlineFrag(m[1]!)),
  },
  {
    re: /(?<!\*)\*(?!\*|\s)([^\n]+?)(?<!\s)\*(?!\*)/,
    build: (m) => el("em", "cm-inplace-em", inlineFrag(m[1]!)),
  },
]

function el(tag: string, className: string, ...children: Node[]): Element {
  const node = document.createElement(tag)
  node.className = className
  node.append(...children)
  return node
}

function inlineFrag(text: string): DocumentFragment {
  const frag = document.createDocumentFragment()
  fill(frag, text)
  return frag
}

/** Tokenise `text` into `parent`, honouring the earliest-matching rule. */
function fill(parent: Node, text: string): void {
  while (text) {
    let at = -1
    let hit: { rule: Rule; m: RegExpMatchArray } | null = null
    for (const rule of RULES) {
      const m = rule.re.exec(text)
      if (m && (at < 0 || m.index! < at)) {
        at = m.index!
        hit = { rule, m }
      }
    }
    if (!hit) {
      parent.appendChild(document.createTextNode(text))
      return
    }
    if (at > 0) parent.appendChild(document.createTextNode(text.slice(0, at)))
    parent.appendChild(hit.rule.build(hit.m))
    text = text.slice(at + hit.m[0].length)
  }
}
