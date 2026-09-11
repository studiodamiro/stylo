/**
 * The right-click menu's link fields: `linkRow` (`[text](url)`) and
 * `wikiLinkRow` (`[[target|label]]`). Split out of `context-menu-actions.ts`.
 */

import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { ICON_PATHS } from "../toolbar/icon-paths"
import { linkPartsIn, wikiLinkAtIn, wikiLinkPartsIn } from "../toolbar/inline-ops"
import { linkOpenFacet } from "./config"
import type { MenuAction, MenuField } from "./context-menu"

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
