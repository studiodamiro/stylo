import type { EditorView } from "@codemirror/view"
import styles from "../styles/stylo.module.css"
import type { CodeLanguages, WikiLinkSource } from "../types"
import { useCodeMirror } from "./useCodeMirror"

export interface SourceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
  /** Fenced-code grammars, forwarded to the Markdown language. Read once. */
  codeLanguages?: CodeLanguages
  /** `[[wikilink]]` autocomplete source. Read once. */
  wikiLinkSource?: WikiLinkSource
  /** Called with the doc string on `Mod-s`. */
  onSave?: (value: string) => void
  /** Called with the `EditorView` once created, and with `null` on teardown. */
  onViewChange?: (view: EditorView | null) => void
}

/** Raw CodeMirror 6 Markdown surface bound to the canonical string. */
export function SourceView({
  value,
  onChange,
  readOnly,
  placeholder,
  codeLanguages,
  wikiLinkSource,
  onSave,
  onViewChange,
}: SourceViewProps) {
  const ref = useCodeMirror({
    value,
    onChange,
    readOnly,
    placeholder,
    codeLanguages,
    wikiLinkSource,
    onSave,
    onViewChange,
  })
  return <div className={styles.source} ref={ref} />
}
