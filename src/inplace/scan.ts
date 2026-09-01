import type { Tree } from "@lezer/common"
import type { Text } from "@codemirror/state"

export type { Tree }

const CODE_NODES = new Set(["InlineCode", "FencedCode", "CodeBlock", "CodeText"])

/**
 * Is `pos` inside a code span or code block? Regex-scanned syntax (`[[…]]`,
 * `$…$`) is left literal in those contexts.
 */
export function inCodeContext(tree: Tree, pos: number): boolean {
  let node = tree.resolveInner(pos, 1)
  for (;;) {
    if (CODE_NODES.has(node.name)) return true
    const parent = node.parent
    if (!parent) return false
    node = parent
  }
}

/** Does any line spanned by `[from, to]` currently hold part of a selection? */
export function rangeRevealed(revealed: Set<number>, doc: Text, from: number, to: number): boolean {
  const first = doc.lineAt(from).number
  const last = doc.lineAt(to).number
  for (let n = first; n <= last; n++) if (revealed.has(n)) return true
  return false
}
