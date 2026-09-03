/**
 * ADR-007 Stage 5 — autoformat on type. After a single typed character at the
 * end of a line, expand a few shorthands the way Obsidian / Typora do:
 *
 *   - `[] ` / `[ ] ` at the line start  → `- [ ] ` (a task item)
 *   - ` ``` ` alone on a line           → a fenced block, caret on the line between
 *   - `$$` alone on a line              → a math block, caret between
 *   - `---` / `***` / `___` as the last line, blank line above → append `\n`,
 *     so the caret steps off the rule instead of being stranded on it
 *
 * Headings (`# `), bullets (`- `), and quotes (`> `) need nothing here — their
 * markers already hide as you type them.
 *
 * One `transactionFilter`: it appends its rewrite to the keystroke's own
 * transaction (`sequential`), so a single undo takes the shorthand back to the
 * literal text.
 */

import { EditorState, type Extension, type TransactionSpec } from "@codemirror/state"
import { fromTableWidget } from "./table-widget"

const RULE_CHAR = new Set(["-", "*", "_"])

export const inPlaceAutoformat: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.isUserEvent("undo") || tr.isUserEvent("redo")) return tr
  if (tr.annotation(fromTableWidget)) return tr
  if (!tr.startState.selection.main.empty) return tr

  // Exactly one single-character insertion, at the caret.
  const startHead = tr.startState.selection.main.head
  let inserted = ""
  let changeCount = 0
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, ins) => {
    changeCount += 1
    if (fromA === toA && fromA === startHead) inserted = ins.toString()
  })
  if (changeCount !== 1 || inserted.length !== 1) return tr

  const doc = tr.newDoc
  const head = tr.newSelection.main.head
  const line = doc.lineAt(head)
  if (head !== line.to) return tr // only at the end of the line
  const text = line.text

  let spec: { changes: TransactionSpec["changes"]; anchor: number } | null = null

  if (inserted === " " && /^\[ ?\] $/.test(text)) {
    spec = { changes: { from: line.from, to: line.to, insert: "- [ ] " }, anchor: line.from + 6 }
  } else if (inserted === "`" && text === "```") {
    spec = { changes: { from: head, insert: "\n\n```" }, anchor: head + 1 }
  } else if (inserted === "$" && text === "$$") {
    spec = { changes: { from: head, insert: "\n\n$$" }, anchor: head + 1 }
  } else if (
    RULE_CHAR.has(inserted) &&
    new RegExp(`^\\${inserted}{3,}$`).test(text) &&
    line.number === doc.lines &&
    (line.number === 1 || doc.line(line.number - 1).text.trim() === "")
  ) {
    spec = { changes: { from: line.to, insert: "\n" }, anchor: line.to + 1 }
  }

  if (!spec) return tr
  return [
    tr,
    {
      changes: spec.changes,
      selection: { anchor: spec.anchor },
      sequential: true,
      scrollIntoView: true,
      userEvent: "input.autoformat",
    },
  ]
})
