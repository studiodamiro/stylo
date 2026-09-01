import type { EditorView } from "@codemirror/view"
import styles from "../styles/stylo.module.css"
import { useCodeMirror } from "./useCodeMirror"

export interface SourceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
  /** Called with the `EditorView` once created, and with `null` on teardown. */
  onViewChange?: (view: EditorView | null) => void
}

/** Raw CodeMirror 6 Markdown surface bound to the canonical string. */
export function SourceView({
  value,
  onChange,
  readOnly,
  placeholder,
  onViewChange,
}: SourceViewProps) {
  const ref = useCodeMirror({ value, onChange, readOnly, placeholder, onViewChange })
  return <div className={styles.source} ref={ref} />
}
