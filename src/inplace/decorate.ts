import { syntaxTree } from "@codemirror/language"
import type { Range } from "@codemirror/state"
import { Decoration, type DecorationSet, type EditorView } from "@codemirror/view"
import { scanInlineMath } from "./math"
import { revealedLines } from "./reveal"
import { scanWikilinks } from "./wikilinks"

const HEADING = /^ATXHeading([1-6])$/

/** Inline spans: style the text between the markers, hide the markers off-caret. */
const INLINE: Record<string, { mark: string; className: string }> = {
  StrongEmphasis: { mark: "EmphasisMark", className: "cm-inplace-strong" },
  Emphasis: { mark: "EmphasisMark", className: "cm-inplace-em" },
  Strikethrough: { mark: "StrikethroughMark", className: "cm-inplace-strike" },
  InlineCode: { mark: "CodeMark", className: "cm-inplace-code" },
}

/** Blocks whose lines must stay monospace on the otherwise-proportional canvas. */
const MONO_BLOCK = new Set(["FencedCode", "CodeBlock"])

export interface InPlaceDecorations {
  decorations: DecorationSet
  /** Widget replacements the caret should step over rather than into. */
  atomic: DecorationSet
}

/**
 * Build the in-place decoration set for the visible viewport only — the syntax
 * tree is walked across `view.visibleRanges`, never the whole document, so the
 * cost stays bounded on long notes. Decorations are collected unordered and
 * sorted by `Decoration.set`, which tolerates the overlaps that nested emphasis
 * and marker-inside-styled-span produce.
 */
export function buildDecorations(view: EditorView): InPlaceDecorations {
  const out: Range<Decoration>[] = []
  const atomic: Range<Decoration>[] = []
  const revealed = revealedLines(view.state)
  const tree = syntaxTree(view.state)
  const { doc } = view.state

  for (const range of view.visibleRanges) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter: (node) => {
        const heading = HEADING.exec(node.name)
        if (heading) {
          const line = doc.lineAt(node.from)
          out.push(
            Decoration.line({
              class: `cm-inplace-heading cm-inplace-h${heading[1]}`,
            }).range(line.from),
          )
          if (!revealed.has(line.number)) {
            const hm = node.node.firstChild
            if (hm?.name === "HeaderMark") {
              out.push(Decoration.replace({}).range(hm.from, Math.min(hm.to + 1, line.to)))
            }
          }
          return // descend: emphasis / links inside the heading still get decorated
        }

        const rule = INLINE[node.name]
        if (rule) {
          const marks = node.node.getChildren(rule.mark)
          const open = marks[0]
          const close = marks[marks.length - 1]
          const paired = open && close && open !== close
          const from = paired ? open.to : node.from
          const to = paired ? close.from : node.to
          if (to > from) {
            out.push(Decoration.mark({ class: rule.className }).range(from, to))
          }
          if (paired && !revealed.has(doc.lineAt(node.from).number)) {
            out.push(Decoration.replace({}).range(open.from, open.to))
            out.push(Decoration.replace({}).range(close.from, close.to))
          }
          return
        }

        if (node.name === "Link") {
          const before = doc.sliceString(Math.max(0, node.from - 1), node.from)
          const after = doc.sliceString(node.to, node.to + 1)
          if (before === "[" && after === "]") return false // inner of a [[wikilink]]

          const marks = node.node.getChildren("LinkMark")
          if (marks.length >= 2) {
            const open = marks[0]!
            const shut = marks[1]!
            if (shut.from > open.to) {
              out.push(Decoration.mark({ class: "cm-inplace-link" }).range(open.to, shut.from))
            }
            if (!revealed.has(doc.lineAt(node.from).number)) {
              out.push(Decoration.replace({}).range(node.from, open.to))
              out.push(Decoration.replace({}).range(shut.from, node.to))
            }
          }
          return false
        }

        if (MONO_BLOCK.has(node.name)) {
          const first = doc.lineAt(node.from).number
          const last = doc.lineAt(Math.min(node.to, doc.length)).number
          for (let n = first; n <= last; n++) {
            out.push(Decoration.line({ class: "cm-inplace-mono" }).range(doc.line(n).from))
          }
          return false
        }

        return
      },
    })

    scanWikilinks(view, range.from, range.to, revealed, tree, out)
    scanInlineMath(view, range.from, range.to, revealed, tree, out, atomic)
  }

  return {
    decorations: Decoration.set(out, true),
    atomic: Decoration.set(atomic, true),
  }
}
