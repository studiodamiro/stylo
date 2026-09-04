import type { EditorView } from "@codemirror/view"
import { placeCaret, selectionOffsets } from "../inplace/table-cell-dom"
import {
  type InlineStr,
  linkString,
  underlineString,
  wikiLinkString,
  wrapString,
} from "./inline-ops"

/** Rewrites a cell's text + selection given the current text and selection span. */
type Build = (text: string, from: number, to: number) => InlineStr

/** The focused in-place table cell within `view`'s DOM, or `null`. */
export function activeTableCell(view: EditorView): HTMLElement | null {
  const el = view.dom.ownerDocument.activeElement
  if (!(el instanceof HTMLElement) || !view.dom.contains(el)) return null
  return el.matches(".cm-inplace-tcell") ? el : null
}

/**
 * Rewrite the focused cell's selected text with `build`, restore the selection
 * over the result, and fire `input` so {@link EditableTableWidget} reserialises
 * the table into the document. The cell shows its raw source while focused, so
 * the string offsets map straight onto the Markdown.
 */
function applyToCell(cell: HTMLElement, build: Build): void {
  const { from, to } = selectionOffsets(cell)
  const next = build(cell.textContent ?? "", from, to)
  cell.textContent = next.text
  placeCaret(cell, next.from, next.to)
  cell.dispatchEvent(new Event("input", { bubbles: true }))
}

/** If the caret is in a table cell, apply `build` there and report it handled. */
export function runInlineInCell(view: EditorView, build: Build): boolean {
  const cell = activeTableCell(view)
  if (!cell) return false
  applyToCell(cell, build)
  return true
}

/** Formatting shortcuts, keyed by the normalised (shift-cased) key. */
const SHORTCUTS: Record<string, Build> = {
  b: (t, f, u) => wrapString(t, f, u, "**"),
  i: (t, f, u) => wrapString(t, f, u, "*"),
  u: underlineString,
  k: linkString,
  K: wikiLinkString, // Mod-Shift-k
}

/**
 * Handle a formatting shortcut (`Mod-b` / `Mod-i` / `Mod-u` / `Mod-k` /
 * `Mod-Shift-k`) typed inside `cell`. The widget calls this because
 * `ignoreEvent()` keeps such keydowns from ever reaching CodeMirror's keymap.
 */
export function handleCellShortcut(event: KeyboardEvent, cell: HTMLElement): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return false
  const build = SHORTCUTS[event.shiftKey ? event.key.toUpperCase() : event.key.toLowerCase()]
  if (!build) return false
  event.preventDefault()
  applyToCell(cell, build)
  return true
}
