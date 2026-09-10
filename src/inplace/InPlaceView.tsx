import { useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { EditorView } from "@codemirror/view"
import { useCodeMirror } from "../editor/useCodeMirror"
import { Embed } from "../render/Embed"
import styles from "../styles/stylo.module.css"
import type { CodeLanguages, EmbedSource, InPlaceConfig, WikiLinkSource } from "../types"
import { EmbedRegistry } from "./embed-registry"
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
  /** `[[wikilink]]` autocomplete source. Read once. */
  wikiLinkSource?: WikiLinkSource
  /** Resolves `![[ref]]` embeds. Read once, at mount — see ADR-009. */
  embedSource?: EmbedSource
  /** Called with the doc string on `Mod-s`. */
  onSave?: (value: string) => void
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
 *
 * `![[ref]]` embeds (ADR-009): each off-caret lone-line embed contributes an
 * inert slot `<div>` via `EmbedWidget`; this component subscribes to the
 * `EmbedRegistry` and portals a host `<Embed>` into every live slot, so one
 * React tree — reusing `Embed` verbatim — serves the canvas and `preview` alike.
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
  wikiLinkSource,
  embedSource,
  onSave,
  onViewChange,
}: InPlaceViewProps) {
  const clickRef = useRef(onWikiLinkClick)
  clickRef.current = onWikiLinkClick
  const linkRef = useRef(onLinkClick)
  linkRef.current = onLinkClick

  const [registry] = useState(() => new EmbedRegistry())
  const slots = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)

  // Built once; a changed handler is picked up through the ref, not a rebuild.
  const [extensions] = useState(() => [
    inPlaceExtension({
      onWikiLinkClick: (target) => clickRef.current?.(target),
      onLinkClick: (href) => linkRef.current?.(href),
      inPlace,
      embedRegistry: embedSource ? registry : undefined,
    }),
  ])

  const ref = useCodeMirror({
    value,
    onChange,
    readOnly,
    placeholder,
    extensions,
    codeLanguages,
    wikiLinkSource,
    onSave,
    onViewChange,
  })
  return (
    <div className={styles.inplace} ref={ref}>
      {embedSource &&
        slots.map((slot) =>
          createPortal(
            <Embed reference={slot.ref} source={embedSource} />,
            slot.el,
            String(slot.id),
          ),
        )}
    </div>
  )
}
