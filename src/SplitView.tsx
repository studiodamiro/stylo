import { Suspense, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { EditorView } from "@codemirror/view"
import { SourceView } from "./editor/SourceView"
import { LazyPreview } from "./render/lazyPreview"
import styles from "./styles/stylo.module.css"
import type {
  CodeLanguages,
  EmbedSource,
  FrontmatterDisplay,
  ResolveErrorInfo,
  TagSource,
  WikiLinkSource,
} from "./types"

export interface SplitViewProps {
  value: string
  onChange: (next: string) => void
  onWikiLinkClick?: (target: string) => void
  readOnly?: boolean
  placeholder?: string
  codeLanguages?: CodeLanguages
  wikiLinkSource?: WikiLinkSource
  tagSource?: TagSource
  embedSource?: EmbedSource
  onResolveError?: (error: unknown, info: ResolveErrorInfo) => void
  frontmatter?: FrontmatterDisplay
  /** Called with the doc string on `Mod-s`. */
  onSave?: (value: string) => void
  /** Forwarded the source pane's `EditorView` for the shared toolbar. */
  onViewChange?: (view: EditorView | null) => void
  /** Host content docked in the source pane, after its search panel. Read once. */
  canvasHeader?: (ctx: { view: EditorView | null }) => ReactNode
}

/**
 * Source and preview side by side. Both panes are a pure function of the same
 * string; the only link between them is a proportional scroll sync. Expects the
 * Stylo root to have a bounded height — otherwise both panes grow and the page
 * scrolls instead.
 */
export function SplitView({
  value,
  onChange,
  onWikiLinkClick,
  readOnly,
  placeholder,
  codeLanguages,
  wikiLinkSource,
  tagSource,
  embedSource,
  onResolveError,
  frontmatter,
  onSave,
  onViewChange,
  canvasHeader,
}: SplitViewProps) {
  const [view, setView] = useState<EditorView | null>(null)
  const previewPane = useRef<HTMLDivElement | null>(null)
  const syncing = useRef(false)

  const handleView = (next: EditorView | null) => {
    setView(next)
    onViewChange?.(next)
  }

  useEffect(() => {
    const source = view?.scrollDOM
    const preview = previewPane.current
    if (!source || !preview) return

    const sync = (from: HTMLElement, to: HTMLElement) => {
      if (syncing.current) return
      const range = from.scrollHeight - from.clientHeight
      if (range <= 0) return
      syncing.current = true
      to.scrollTop = (from.scrollTop / range) * (to.scrollHeight - to.clientHeight)
      requestAnimationFrame(() => {
        syncing.current = false
      })
    }

    const fromSource = () => sync(source, preview)
    const fromPreview = () => sync(preview, source)
    source.addEventListener("scroll", fromSource, { passive: true })
    preview.addEventListener("scroll", fromPreview, { passive: true })
    return () => {
      source.removeEventListener("scroll", fromSource)
      preview.removeEventListener("scroll", fromPreview)
    }
  }, [view])

  return (
    <div className={styles.split}>
      <div className={styles.splitPane}>
        <SourceView
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          codeLanguages={codeLanguages}
          wikiLinkSource={wikiLinkSource}
          tagSource={tagSource}
          onResolveError={onResolveError}
          onSave={onSave}
          onViewChange={handleView}
          canvasHeader={canvasHeader}
        />
      </div>
      <div className={styles.splitPane} ref={previewPane}>
        <Suspense fallback={<div className={styles.preview} aria-busy="true" />}>
          <LazyPreview
            value={value}
            onWikiLinkClick={onWikiLinkClick}
            embedSource={embedSource}
            onResolveError={onResolveError}
            frontmatter={frontmatter}
          />
        </Suspense>
      </div>
    </div>
  )
}
