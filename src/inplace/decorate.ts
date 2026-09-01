import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import { Decoration, type DecorationSet, type EditorView } from "@codemirror/view"
import { revealedLines } from "./reveal"

const HEADING = /^ATXHeading([1-6])$/

/**
 * Build the in-place decoration set for the visible viewport only — the syntax
 * tree is walked across `view.visibleRanges`, never the whole document, so the
 * cost stays bounded on long notes.
 *
 * Increment 1 handles ATX headings: a line class for display sizing, plus a
 * replace decoration that hides the `#` marker unless the caret is on that line.
 * Later increments add cases to the same switch.
 */
export function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const revealed = revealedLines(view.state)
  const tree = syntaxTree(view.state)

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        const heading = HEADING.exec(node.name)
        if (!heading) return

        const line = view.state.doc.lineAt(node.from)
        builder.add(
          line.from,
          line.from,
          Decoration.line({ class: `cm-inplace-heading cm-inplace-h${heading[1]}` }),
        )

        if (!revealed.has(line.number)) {
          const mark = node.node.firstChild
          if (mark?.name === "HeaderMark") {
            // Hide the `#`s and the single space that follows them.
            builder.add(mark.from, Math.min(mark.to + 1, line.to), Decoration.replace({}))
          }
        }

        return false
      },
    })
  }

  return builder.finish()
}
