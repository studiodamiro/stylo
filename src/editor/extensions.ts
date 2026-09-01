import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view"
import { styloTheme } from "./theme"

/**
 * Static extensions — created once with the view.
 *
 * No `codeLanguages`: fenced blocks get Markdown-level styling only. Passing the
 * full `@codemirror/language-data` grammar set emitted ~110 lazy language chunks
 * into the published package — the zero-bloat mandate inverted for a notes
 * editor. Per-language highlighting will return as an opt-in `codeLanguages`
 * pass-through prop. See the 2026-09-01 journal note and the ADR-001 amendment.
 */
export function baseExtensions(): Extension {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage }),
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
