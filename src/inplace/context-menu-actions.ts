/**
 * Maps the shared toolbar command set onto rows for the in-place right-click
 * menu, and classifies what the caret is sitting in so the menu offers the
 * right group. Every command already carries its own `run` / `isActive` /
 * `disabled`, so context-sensitivity is inherited, not re-derived here.
 */

import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import { frontmatterRange } from "../frontmatter"
import { activeTableCell } from "../toolbar/cell-inline"
import { BUILTIN_BY_ID } from "../toolbar/commands"
import { fencedCodeActive, mathBlockActive } from "../toolbar/fence"
import { ICON_PATHS } from "../toolbar/icon-paths"
import { linkPartsIn } from "../toolbar/inline-ops"
import { tableActive } from "../toolbar/table"
import { linkOpenFacet } from "./config"
import type { MenuAction, MenuField, MenuRow } from "./context-menu"
import { selectionOffsets } from "./table-cell-dom"

/** Menu glyph for a command id — headings share one, the rest map by id. */
const iconFor = (id: ToolbarCommandId): string | undefined =>
  id === "h1" || id === "h2" || id === "h3" ? ICON_PATHS.heading : ICON_PATHS[id]

const INLINE_MARK_IDS: ToolbarCommandId[] = ["bold", "italic", "strike", "code"]
const BLOCK_IDS: ToolbarCommandId[] = [
  "h1",
  "h2",
  "h3",
  "quote",
  "bulletList",
  "orderedList",
  "task",
  "codeBlock",
  "hr",
  "mathBlock",
  "frontmatter",
]
const INSERT_IDS: ToolbarCommandId[] = ["table", "hr", "codeBlock", "mathBlock", "frontmatter"]

const caretLine = (s: EditorState): string => s.doc.lineAt(s.selection.main.head).text
const inHeading = (s: EditorState): boolean => /^\s{0,3}#{1,6}(?:\s|$)/.test(caretLine(s))
const inQuoteOrList = (s: EditorState): boolean =>
  /^\s{0,3}(?:>|[-*+] |\d+\. )/.test(caretLine(s))
const inFrontmatter = (s: EditorState): boolean => {
  const r = frontmatterRange(s.doc)
  return r !== null && s.selection.main.head <= r.to
}

/**
 * A non-empty text selection inside a focused editable table cell. The cell is a
 * `contenteditable` surface, so this selection lives in the DOM, not in
 * `state.selection` — but the inline commands route through `runInlineInCell`,
 * so the inline group still applies.
 */
export function cellHasSelection(view: EditorView): boolean {
  const cell = activeTableCell(view)
  if (!cell) return false
  const { from, to } = selectionOffsets(cell)
  return to > from
}

export type MenuContext = "selection" | "block" | "plain"

/** What the menu should lead with, given the current selection. */
export function classifyContext(state: EditorState): MenuContext {
  if (!state.selection.main.empty) return "selection"
  if (
    fencedCodeActive(state) ||
    mathBlockActive(state) ||
    tableActive(state) ||
    inFrontmatter(state) ||
    inHeading(state) ||
    inQuoteOrList(state)
  ) {
    return "block"
  }
  return "plain"
}

const toAction = (view: EditorView, id: ToolbarCommandId): MenuAction | null => {
  const cmd = BUILTIN_BY_ID[id]
  if (!cmd) return null
  return {
    label: cmd.title,
    icon: iconFor(id),
    active: Boolean(cmd.isActive?.(view.state)),
    disabled: Boolean(cmd.disabled?.(view.state)),
    onSelect: () => {
      cmd.run(view)
      view.focus()
    },
  }
}

const actions = (
  view: EditorView,
  ids: ToolbarCommandId[],
  dropDisabled = false,
): MenuAction[] => {
  const out: MenuAction[] = []
  for (const id of ids) {
    const a = toAction(view, id)
    if (a && !(dropDisabled && a.disabled)) out.push(a)
  }
  return out
}

const clipboardRows = (view: EditorView): MenuRow[] => {
  const doc = view.contentDOM.ownerDocument
  const exec = (cmd: "cut" | "copy") => () => {
    view.focus()
    try {
      doc.execCommand(cmd)
    } catch {
      /* not permitted — the keyboard shortcut still works */
    }
  }
  const paste = () => {
    const cell = activeTableCell(view)
    if (!cell) view.focus()
    view.dom.ownerDocument.defaultView?.navigator?.clipboard
      ?.readText()
      .then((text) => {
        if (!text) return
        if (cell) doc.execCommand("insertText", false, text)
        else view.dispatch(view.state.replaceSelection(text))
      })
      .catch(() => {
        /* clipboard read denied — the keyboard shortcut still works */
      })
  }
  return [
    { label: "Cut", icon: ICON_PATHS.cut, onSelect: exec("cut") },
    { label: "Copy", icon: ICON_PATHS.copy, onSelect: exec("copy") },
    { label: "Paste", icon: ICON_PATHS.paste, onSelect: paste },
  ]
}

/**
 * A "Link" row: an editable URL field. Prefilled + Open / Remove when the caret
 * is inside an existing `[text](url)`; empty (wraps the selection on submit)
 * when there is a selection; `null` when neither applies. Wikilinks keep the
 * plain toggle for now — the same field is a fast follow.
 */
/** The `(...)` destination for a link — angle-bracketed when it has whitespace
 *  or parens, so `[a](b c)` (invalid Markdown) becomes `[a](<b c>)`. */
const linkDest = (url: string): string => {
  const bare = url.trim().replace(/^<([^]*)>$/, "$1")
  return /[\s()]/.test(bare) ? `<${bare.replace(/[<>]/g, "")}>` : bare
}
/** Strip angle brackets for display in the URL input. */
const bareUrl = (url: string): string => url.replace(/^<([^]*)>$/, "$1")

export function linkRow(view: EditorView): MenuField | null {
  const { state } = view
  const sel = state.selection.main
  const line = state.doc.lineAt(sel.head)
  const parts = linkPartsIn(line.text, sel.head - line.from)

  if (parts) {
    const from = line.from + parts.from
    const to = line.from + parts.to
    const urlFrom = line.from + parts.urlFrom
    const urlTo = line.from + parts.urlTo
    const openHref = state.facet(linkOpenFacet)
    const rowActions: MenuAction[] = []
    if (openHref && parts.url) {
      rowActions.push({
        label: "Open link",
        icon: ICON_PATHS.link,
        onSelect: () => openHref(parts.url),
      })
    }
    rowActions.push({
      label: "Remove link",
      onSelect: () => {
        view.dispatch({
          changes: { from, to, insert: parts.label },
          selection: { anchor: from, head: from + parts.label.length },
        })
        view.focus()
      },
    })
    return {
      field: true,
      label: "Link",
      icon: ICON_PATHS.link,
      value: bareUrl(parts.url),
      placeholder: "https://…",
      onSubmit: (url) => {
        view.dispatch({ changes: { from: urlFrom, to: urlTo, insert: linkDest(url) } })
        view.focus()
      },
      actions: rowActions,
    }
  }

  if (!sel.empty) {
    const label = state.sliceDoc(sel.from, sel.to)
    return {
      field: true,
      label: "Link",
      icon: ICON_PATHS.link,
      value: "",
      placeholder: "https://…",
      onSubmit: (url) => {
        const text = label || "link"
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: `[${text}](${linkDest(url)})` },
          selection: { anchor: sel.from + 1, head: sel.from + 1 + text.length },
        })
        view.focus()
      },
    }
  }
  return null
}

/** Inline-mark rows, then the Link field (or its plain toggle), the wikilink
 *  toggle, and inline math. */
function inlineGroup(view: EditorView): MenuRow[] {
  const rows: MenuRow[] = actions(view, INLINE_MARK_IDS)
  const link = linkRow(view)
  const linkToggle = toAction(view, "link")
  if (link) rows.push(link)
  else if (linkToggle) rows.push(linkToggle)
  const wiki = toAction(view, "wikilink")
  if (wiki) rows.push(wiki)
  rows.push(...actions(view, ["math"]))
  return rows
}

/** The full row list for a right-click at the current selection. */
export function menuRows(view: EditorView): MenuRow[] {
  const ctx = classifyContext(view.state)
  const link = linkRow(view)
  if (ctx === "selection" || cellHasSelection(view)) {
    return [...inlineGroup(view), "separator", ...clipboardRows(view)]
  }
  const lead: MenuRow[] = link ? [link, "separator"] : []
  const insert: MenuRow = {
    label: "Insert",
    icon: ICON_PATHS.insert,
    rows: actions(view, INSERT_IDS, true),
  }
  if (ctx === "block") {
    const rows = actions(view, BLOCK_IDS, true)
    return [
      ...lead,
      ...rows,
      ...(rows.length ? ["separator" as const] : []),
      insert,
      "separator",
      ...clipboardRows(view),
    ]
  }
  return [...lead, insert, "separator", ...clipboardRows(view)]
}
