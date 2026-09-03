/**
 * Maps the shared toolbar command set onto rows for the in-place right-click
 * menu. One shape everywhere (Obsidian style): the link rows, then Format /
 * Paragraph / Insert submenus, then clipboard. Every command already carries
 * its own `run` / `isActive` / `disabled`, so an item that can't apply where
 * the caret sits is greyed, not hidden — the menu shape stays put.
 */

import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import { activeTableCell } from "../toolbar/cell-inline"
import { BUILTIN_BY_ID } from "../toolbar/commands"
import { fenceInfoAt, fencedCodeActive } from "../toolbar/fence"
import { ICON_PATHS } from "../toolbar/icon-paths"
import { linkPartsIn, wikiLinkAtIn, wikiLinkPartsIn } from "../toolbar/inline-ops"
import { linkOpenFacet, selectionUIFacet } from "./config"
import type { MenuAction, MenuField, MenuRow, MenuSubmenu } from "./context-menu"
import { selectionOffsets } from "./table-cell-dom"

/** Menu glyph for a command id — headings share one, the rest map by id. */
const iconFor = (id: ToolbarCommandId): string | undefined =>
  id === "h1" || id === "h2" || id === "h3" ? ICON_PATHS.heading : ICON_PATHS[id]

/** Obsidian's three grouped submenus, adapted to the commands Stylo has. */
const FORMAT_MARK_IDS: ToolbarCommandId[] = ["bold", "italic", "strike"]
const FORMAT_CODE_IDS: ToolbarCommandId[] = ["code", "math"]
const PARA_LIST_IDS: ToolbarCommandId[] = ["bulletList", "orderedList", "task"]
const PARA_HEADING_IDS: ToolbarCommandId[] = ["h1", "h2", "h3"]
const INSERT_INLINE_IDS: ToolbarCommandId[] = ["table", "hr"]
const INSERT_BLOCK_IDS: ToolbarCommandId[] = ["codeBlock", "mathBlock", "frontmatter"]

/**
 * A non-empty text selection inside a focused editable table cell. The cell is a
 * `contenteditable` surface, so this selection lives in the DOM, not in
 * `state.selection` — but the inline commands route through `runInlineInCell`,
 * so the Format group still applies.
 */
export function cellHasSelection(view: EditorView): boolean {
  const cell = activeTableCell(view)
  if (!cell) return false
  const { from, to } = selectionOffsets(cell)
  return to > from
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
  // Menu Paste needs async clipboard read; without it there is no user-gesture
  // path from a button. Rather than a live row that silently no-ops, show it
  // disabled and point at the shortcut, which always works.
  const clipboard = view.dom.ownerDocument.defaultView?.navigator?.clipboard
  const canPaste = typeof clipboard?.readText === "function"
  const paste = () => {
    const cell = activeTableCell(view)
    if (!cell) view.focus()
    clipboard
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
    canPaste
      ? { label: "Paste", icon: ICON_PATHS.paste, onSelect: paste }
      : {
          label: "Paste",
          icon: ICON_PATHS.paste,
          disabled: true,
          title: "Paste with the keyboard shortcut",
          onSelect: () => {},
        },
  ]
}

/** The `(...)` destination for a link — angle-bracketed when it has whitespace
 *  or parens, so `[a](b c)` (invalid Markdown) becomes `[a](<b c>)`. */
const linkDest = (url: string): string => {
  const bare = url.trim().replace(/^<([^]*)>$/, "$1")
  return /[\s()]/.test(bare) ? `<${bare.replace(/[<>]/g, "")}>` : bare
}
/** Strip angle brackets for display in the URL input. */
const bareUrl = (url: string): string => url.replace(/^<([^]*)>$/, "$1")

/**
 * The `[text](url)` or `[[target|label]]` that the selection sits in, with its
 * display text and full span. Applying a link or wikilink to such a selection
 * then *replaces* that construct instead of nesting a new one inside it (which
 * produces malformed Markdown). `null` when the selection is in neither.
 */
function inlineLinkHost(
  state: EditorState,
  sel: { from: number; to: number },
): { from: number; to: number; text: string } | null {
  const line = state.doc.lineAt(sel.from)
  if (state.doc.lineAt(sel.to).number !== line.number) return null
  const a = sel.from - line.from
  const b = sel.to - line.from
  const link = linkPartsIn(line.text, a) ?? linkPartsIn(line.text, b)
  if (link) return { from: line.from + link.from, to: line.from + link.to, text: link.label }
  const wiki = wikiLinkAtIn(line.text, a) ?? wikiLinkAtIn(line.text, b)
  if (wiki) return { from: line.from + wiki.from, to: line.from + wiki.to, text: wiki.label }
  return null
}

/**
 * The "Add external link" row — an editable `[text](url)` URL field. Prefilled,
 * with Open / Remove and the label "Edit external link", when the caret sits in
 * an existing `[text](url)`; otherwise an empty field that wraps the selection
 * (or the word the menu just selected) on submit.
 */
export function linkRow(view: EditorView): MenuField {
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
      label: "Edit external link",
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

  // A selection already inside a link / wikilink: swap that whole construct for
  // the new link rather than nesting one inside it.
  const host = inlineLinkHost(state, sel)
  const from = host ? host.from : sel.from
  const to = host ? host.to : sel.to
  const label = (host ? host.text : state.sliceDoc(sel.from, sel.to)) || "link"
  return {
    field: true,
    label: "Add external link",
    icon: ICON_PATHS.link,
    value: "",
    placeholder: "https://…",
    onSubmit: (url) => {
      view.dispatch({
        changes: { from, to, insert: `[${label}](${linkDest(url)})` },
        selection: { anchor: from + 1, head: from + 1 + label.length },
      })
      view.focus()
    },
  }
}

/**
 * The "Add link" row — an editable `[[target]]` field for an internal link.
 * Prefilled, with Remove and the label "Edit link", when the caret sits in an
 * existing `[[target|label]]`; otherwise an empty field that wraps the
 * selection (or the word the menu just selected) on submit.
 */
export function wikiLinkRow(view: EditorView): MenuField {
  const { state } = view
  const sel = state.selection.main
  const line = state.doc.lineAt(sel.head)
  const parts = wikiLinkPartsIn(line.text, sel.head - line.from)

  if (parts) {
    const from = line.from + parts.from
    const to = line.from + parts.to
    const targetFrom = line.from + parts.targetFrom
    const targetTo = line.from + parts.targetTo
    const display = parts.label || parts.target
    return {
      field: true,
      label: "Edit link",
      icon: ICON_PATHS.wikilink,
      value: parts.target,
      placeholder: "note or path",
      onSubmit: (target) => {
        if (target) {
          view.dispatch({ changes: { from: targetFrom, to: targetTo, insert: target } })
        }
        view.focus()
      },
      actions: [
        {
          label: "Remove link",
          onSelect: () => {
            view.dispatch({
              changes: { from, to, insert: display },
              selection: { anchor: from, head: from + display.length },
            })
            view.focus()
          },
        },
      ],
    }
  }

  // A selection already inside a link / wikilink: swap that whole construct
  // rather than nesting a `[[…]]` inside it.
  const host = inlineLinkHost(state, sel)
  const from = host ? host.from : sel.from
  const to = host ? host.to : sel.to
  const label = host ? host.text : state.sliceDoc(sel.from, sel.to)
  return {
    field: true,
    label: "Add link",
    icon: ICON_PATHS.wikilink,
    value: "",
    placeholder: "note or path",
    onSubmit: (target) => {
      const t = target || label || "target"
      const insert = !target || target === label ? `[[${t}]]` : `[[${target}|${label}]]`
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + 2, head: from + 2 + (target || t).length },
      })
      view.focus()
    },
  }
}

const submenu = (
  label: string,
  icon: string | undefined,
  rows: MenuRow[],
  disabled = false,
): MenuSubmenu => ({ label, icon, rows, disabled })

/**
 * The "Language" row shown when the caret is in a fenced code block: an
 * editable info string (` ```ts `), plus **Remove code block** to unwrap it.
 * The opening fence line is hidden in the seamless canvas, so this is the way
 * to reach the language at all.
 */
export function codeBlockRow(view: EditorView): MenuField {
  const info = fenceInfoAt(view.state)
  return {
    field: true,
    label: "Language",
    icon: ICON_PATHS.codeBlock,
    value: info?.lang ?? "",
    placeholder: "ts, python, …",
    onSubmit: (lang) => {
      if (info) view.dispatch({ changes: { from: info.from, to: info.to, insert: lang.trim() } })
      view.focus()
    },
    actions: [
      {
        label: "Remove code block",
        onSelect: () => {
          BUILTIN_BY_ID.codeBlock?.run(view)
          view.focus()
        },
      },
    ],
  }
}

/** Bold / Italic / Strikethrough, then inline code + inline math. */
const formatGroup = (view: EditorView): MenuRow[] => [
  ...actions(view, FORMAT_MARK_IDS),
  "separator",
  ...actions(view, FORMAT_CODE_IDS),
]

/** List types, then heading levels + Body, then quote. Obsidian's "Paragraph". */
const paragraphGroup = (view: EditorView): MenuRow[] => [
  ...actions(view, PARA_LIST_IDS),
  "separator",
  ...actions(view, [...PARA_HEADING_IDS, "body"]),
  "separator",
  ...actions(view, ["quote"]),
]

/** New-block actions. Each still carries its own enabled state. */
const insertGroup = (view: EditorView): MenuRow[] => [
  ...actions(view, INSERT_INLINE_IDS),
  "separator",
  ...actions(view, INSERT_BLOCK_IDS),
]

/**
 * The right-click menu — one shape everywhere: internal / external link rows,
 * then Format / Paragraph / Insert submenus, then clipboard. `selectionUI`
 * decides whether the mark surfaces (the link rows and Format) live here or on
 * the floating bar; Paragraph and Insert are block-level and always shown.
 */
export function menuRows(view: EditorView): MenuRow[] {
  // A table cell only supports inline formatting — no block or insert there.
  if (cellHasSelection(view)) {
    return [submenu("Format", ICON_PATHS.format, formatGroup(view)), "separator", ...clipboardRows(view)]
  }

  // A fenced code block is a literal context — offer only its language and an
  // unwrap, plus clipboard.
  if (fencedCodeActive(view.state)) {
    return [codeBlockRow(view), "separator", ...clipboardRows(view)]
  }

  const { state } = view
  const sel = state.selection.main
  const line = state.doc.lineAt(sel.head)
  // Insert drops a brand-new block — the whole submenu is disabled off an empty
  // line (a table mid-paragraph would split it) rather than every item greyed.
  const insertOk = line.text.trim() === ""
  // Nothing to format at a bare caret with no word — wrapping there just drops
  // an empty `****`, which shows as literal marks. The right-click menu selects
  // the word first, so this only bites on a blank line or in whitespace.
  const formatOk = !sel.empty || Boolean(state.wordAt(sel.head))

  const marksHere = state.facet(selectionUIFacet) === "menu"
  const rows: MenuRow[] = []
  if (marksHere) {
    rows.push(wikiLinkRow(view), linkRow(view), "separator")
    rows.push(submenu("Format", ICON_PATHS.format, formatGroup(view), !formatOk))
  }
  rows.push(submenu("Paragraph", ICON_PATHS.paragraph, paragraphGroup(view)))
  rows.push(submenu("Insert", ICON_PATHS.insert, insertGroup(view), !insertOk))
  rows.push("separator", ...clipboardRows(view))
  return rows
}
