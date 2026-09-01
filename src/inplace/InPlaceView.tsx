import { useCodeMirror } from "../editor/useCodeMirror"
import styles from "../styles/stylo.module.css"
import { inPlaceExtension } from "./extension"

const IN_PLACE = [inPlaceExtension()]

export interface InPlaceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
}

/**
 * The in-place canvas: a CodeMirror surface that renders Markdown structure live
 * via view decorations, revealing the raw source under the cursor. Loaded lazily
 * so `mode="source"` consumers never pull it in.
 *
 * Increment 1 renders headings; later increments extend the decoration plugin.
 */
export function InPlaceView({ value, onChange, readOnly, placeholder }: InPlaceViewProps) {
  const ref = useCodeMirror({ value, onChange, readOnly, placeholder, extensions: IN_PLACE })
  return <div className={styles.inplace} ref={ref} />
}
