import { useRef, useState } from "react"
import type { EditorView } from "@codemirror/view"
import { useCodeMirror } from "../editor/useCodeMirror"
import styles from "../styles/stylo.module.css"
import type { CodeLanguages, InPlaceConfig } from "../types"
import { inPlaceExtension } from "./extension"

export interface InPlaceViewProps {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
  onWikiLinkClick?: (target: string) => void
  /** Fired by the link editor's "Open link" action. */
  onLinkClick?: (href: string) => void
  /** Read once, when the canvas mounts — see ADR-005. */
  inPlace?: InPlaceConfig
  /** Fenced-code grammars, forwarded to the Markdown language. Read once. */
  codeLanguages?: CodeLanguages
  /** Called with the `EditorView` once created, and with `null` on teardown. */
  onViewChange?: (view: EditorView | null) => void
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
  onLinkClick,
  inPlace,
  codeLanguages,
  onViewChange,
}: InPlaceViewProps) {
  const clickRef = useRef(onWikiLinkClick)
  clickRef.current = onWikiLinkClick
  const linkRef = useRef(onLinkClick)
  linkRef.current = onLinkClick

  // Built once; a changed handler is picked up through the ref, not a rebuild.
  const [extensions] = useState(() => [
    inPlaceExtension({
      onWikiLinkClick: (target) => clickRef.current?.(target),
      onLinkClick: (href) => linkRef.current?.(href),
      inPlace,
    }),
  ])

  const ref = useCodeMirror({
    value,
    onChange,
    readOnly,
    placeholder,
    extensions,
    codeLanguages,
    onViewChange,
  })
  return <div className={styles.inplace} ref={ref} />
}
