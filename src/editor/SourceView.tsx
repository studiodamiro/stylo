import styles from "../styles/stylo.module.css"
import { useCodeMirror } from "./useCodeMirror"

export interface SourceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
}

/** Raw CodeMirror 6 Markdown surface bound to the canonical string. */
export function SourceView({ value, onChange, readOnly, placeholder }: SourceViewProps) {
  const ref = useCodeMirror({ value, onChange, readOnly, placeholder })
  return <div className={styles.source} ref={ref} />
}
