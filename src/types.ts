export type StyloMode = "in-place" | "source" | "preview" | "split"

export interface StyloProps {
  /** The canonical Markdown document. Stylo never holds a parsed model of it. */
  value: string
  /** Called with the complete Markdown string on every edit. */
  onChange: (next: string) => void
  /**
   * Interaction layout. `in-place` and `split` are not implemented in the current
   * milestone and fall back to `source` (with one console warning).
   *
   * TODO(ADR-002): the default becomes `"in-place"` once decorations land.
   */
  mode?: StyloMode
  /** Invoked when a rendered `[[wikilink]]` is activated in the preview. */
  onWikiLinkClick?: (target: string) => void
  /** Render the source surface read-only. */
  readOnly?: boolean
  /** Placeholder text shown when the document is empty (source surface). */
  placeholder?: string
  /** Extra class on the root element, alongside the internal classes. */
  className?: string
}
