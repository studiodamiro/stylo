import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { search, searchKeymap } from "@codemirror/search"
import { EditorState, type Extension, Prec } from "@codemirror/state"
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view"
import { markdownKeymap } from "../toolbar/keymap"
import { tableKeymap, tableRealign } from "../toolbar/table"
import type { CodeLanguages, WikiLinkSource } from "../types"
import { styloHighlighting } from "./highlight"
import { saveHandler } from "./save"
import { styloTheme } from "./theme"
import { wikilinkCompletion } from "./wikilink-complete"

/**
 * Static extensions — created once with the view.
 *
 * `codeLanguages` is forwarded verbatim to `@codemirror/lang-markdown` for
 * fenced-code sub-highlighting. Stylo bundles none: passing the full
 * `@codemirror/language-data` grammar set emitted ~110 lazy language chunks into
 * the published package — the zero-bloat mandate inverted for a notes editor. A
 * consumer opts in with exactly the set they want. See the 2026-09-01 journal
 * note and the ADR-001 amendment.
 */
export function baseExtensions(
  codeLanguages?: CodeLanguages,
  wikiLinkSource?: WikiLinkSource,
): Extension {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    Prec.high(tableKeymap),
    markdownKeymap,
    tableRealign,
    // Find / replace. `search` supplies the panel and its state; `searchKeymap`
    // carries in-panel navigation (`Mod-g` next, `Shift-Mod-g` previous,
    // `Mod-Alt-g` replace, `Escape` close). Opening on `Mod-f` also comes from
    // the `search` toolbar command's `keys`, so the panel opens whether or not
    // the visible toolbar is mounted. Panel docks at the top, editor-style.
    search({ top: true }),
    keymap.of(searchKeymap),
    markdown({ base: markdownLanguage, codeLanguages }),
    styloHighlighting,
    // `[[wikilink]]` autocomplete — a no-op unless the host passes a source.
    wikilinkCompletion(wikiLinkSource),
    EditorView.lineWrapping,
    styloTheme,
  ]
}

/** Extensions that depend on props and are swapped via a compartment on change. */
export function dynamicConfig(opts: {
  readOnly: boolean
  placeholder?: string
  save?: (value: string) => void
}): Extension {
  return [
    EditorState.readOnly.of(opts.readOnly),
    EditorView.editable.of(!opts.readOnly),
    opts.placeholder ? placeholderExt(opts.placeholder) : [],
    opts.save ? saveHandler.of(opts.save) : [],
  ]
}
