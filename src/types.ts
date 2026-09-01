export type StyloMode = "in-place" | "source" | "preview" | "split"

/**
 * Per-construct on/off switches for the in-place canvas. Each key defaults to
 * `true`; setting one `false` leaves that construct as plain source — no
 * decoration, no cursor-reveal behaviour. See ADR-005.
 */
export interface InPlaceDecorationToggles {
  headings?: boolean
  emphasis?: boolean
  links?: boolean
  wikilinks?: boolean
  math?: boolean
  lists?: boolean
  tasks?: boolean
  blockquote?: boolean
  horizontalRule?: boolean
  code?: boolean
  frontmatter?: boolean
  tables?: boolean
}

export interface InPlaceConfig {
  /** Which decoration types the in-place canvas renders. Read once, at mount. */
  decorations?: InPlaceDecorationToggles
}

export interface StyloProps {
  /** The canonical Markdown document. Stylo never holds a parsed model of it. */
  value: string
  /** Called with the complete Markdown string on every edit. */
  onChange: (next: string) => void
  /**
   * Interaction layout. Defaults to `"in-place"` — the live decoration canvas.
   * `"source"` is the plain surface and avoids loading the render chunk.
   */
  mode?: StyloMode
  /** Invoked when a `[[wikilink]]` is activated in the preview or in-place canvas. */
  onWikiLinkClick?: (target: string) => void
  /** Configures the in-place canvas (ADR-005). Applied when it mounts. */
  inPlace?: InPlaceConfig
  /** Render the source surface read-only. */
  readOnly?: boolean
  /** Placeholder text shown when the document is empty (source surface). */
  placeholder?: string
  /** Extra class on the root element, alongside the internal classes. */
  className?: string
}
