import { useRef, useState } from "react"
import { useCodeMirror } from "../editor/useCodeMirror"
import styles from "../styles/stylo.module.css"
import type { InPlaceConfig } from "../types"
import { inPlaceExtension } from "./extension"

export interface InPlaceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
  onWikiLinkClick?: (target: string) => void
  /** Read once, when the canvas mounts — see ADR-005. */
  inPlace?: InPlaceConfig
}

/**
 * The in-place canvas: a CodeMirror surface that renders Markdown structure live
 * via view decorations, revealing the raw source under the cursor. Loaded lazily
 * so `mode="source"` consumers never pull it in.
 *
 * The extension array (and the `inPlace` config baked into it) is built once;
 * `onWikiLinkClick` is reached through a ref so a changed handler does not force
 * the editor to be rebuilt.
 */
export function InPlaceView({
  value,
  onChange,
  readOnly,
  placeholder,
  onWikiLinkClick,
  inPlace,
}: InPlaceViewProps) {
  const clickRef = useRef(onWikiLinkClick)
  clickRef.current = onWikiLinkClick

  // Built once; a changed handler is picked up through the ref, not a rebuild.
  const [extensions] = useState(() => [
    inPlaceExtension({ onWikiLinkClick: (target) => clickRef.current?.(target), inPlace }),
  ])

  const ref = useCodeMirror({ value, onChange, readOnly, placeholder, extensions })
  return <div className={styles.inplace} ref={ref} />
}
