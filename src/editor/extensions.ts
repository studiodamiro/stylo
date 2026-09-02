import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { EditorState, type Extension, Prec } from "@codemirror/state"
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view"
import { markdownKeymap } from "../toolbar/keymap"
import { tableKeymap, tableRealign } from "../toolbar/table"
import type { CodeLanguages } from "../types"
import { styloHighlighting } from "./highlight"
import { styloTheme } from "./theme"

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
export function baseExtensions(codeLanguages?: CodeLanguages): Extension {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    Prec.high(tableKeymap),
    markdownKeymap,
    tableRealign,
    markdown({ base: markdownLanguage, codeLanguages }),
    styloHighlighting,
    EditorView.lineWrapping,
    styloTheme,
  ]
}

/** Extensions that depend on props and are swapped via a compartment on change. */
export function dynamicConfig(opts: { readOnly: boolean; placeholder?: string }): Extension {
  return [
    EditorState.readOnly.of(opts.readOnly),
    EditorView.editable.of(!opts.readOnly),
    opts.placeholder ? placeholderExt(opts.placeholder) : [],
  ]
}
