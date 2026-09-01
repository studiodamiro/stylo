import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view"
import { styloTheme } from "./theme"

/** Static extensions — created once with the view. */
export function baseExtensions(): Extension {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
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
