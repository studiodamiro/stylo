import type { ReactNode } from "react"
import type { Language, LanguageDescription } from "@codemirror/language"

export type StyloMode = "in-place" | "source" | "preview" | "split"

/**
 * How `preview` (and the preview pane of `split`) treats the leading `---` YAML
 * block. `"hidden"` (default) drops it from the render; `"code"` renders it as a
 * styled `<pre class="stylo-frontmatter">` a consumer can restyle with its own
 * CSS. A parsed key/value panel is deferred (ADR-001, needs a YAML parser).
 */
export type FrontmatterDisplay = "hidden" | "code"

/**
 * Built-in toolbar command identifiers. In a `ToolbarConfig["items"]` list,
 * `"|"` inserts a visual separator. See ADR-002 §2.
 */
export type ToolbarCommandId =
  | "undo"
  | "redo"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "codeBlock"
  | "link"
  | "wikilink"
  | "quote"
  | "bulletList"
  | "orderedList"
  | "task"
  | "hr"
  | "frontmatter"
  | "table"
  | "math"
  | "mathBlock"

export interface ToolbarConfig {
  /**
   * Ordered toolbar items — any subset of the built-in command ids, in any
   * order, with `"|"` for a separator. Omit for the full default bar.
   */
  items?: (ToolbarCommandId | "|")[]
}

/**
 * Grammars for fenced-code sub-highlighting, forwarded verbatim to
 * `@codemirror/lang-markdown`. Stylo ships none by default — a consumer opts in
 * with exactly the set they want (`codeLanguages={languages}` from
 * `@codemirror/language-data`, or a hand-built list). Affects the CodeMirror
 * surfaces only (`source`, `split`, `in-place`); `preview` is a separate
 * pipeline. See the ADR-001 amendment.
 */
export type CodeLanguages =
  readonly LanguageDescription[] | ((info: string) => Language | LanguageDescription | null)

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

/**
 * How the in-place canvas handles editing a table.
 * `"source"` (default) reveals the aligned pipe source under the caret;
 * `"cells"` keeps the rendered `<table>` and edits its cells in place.
 */
export type TableEditing = "source" | "cells"

/**
 * Whether the in-place canvas shows a construct's Markdown markers when the
 * caret is on its line. `"caret"` (default) reveals them for editing and
 * re-hides them on the way out — Obsidian's Live Preview. `"never"` keeps every
 * inline marker hidden at all times; formatting is changed through the toolbar,
 * the right-click menu, shortcuts, and autoformat-on-type instead. See ADR-007;
 * `"never"` is being rolled out in stages.
 */
export type RevealMode = "caret" | "never"

/**
 * What appears when text is selected in the in-place canvas. `"menu"` (default)
 * puts the inline-formatting group in the right-click menu and shows no floating
 * bar; `"bar"` shows a floating bar above the selection and drops that group
 * from the menu so nothing is doubled; `"none"` shows neither and leaves the
 * main toolbar as the only formatting surface. The toolbar is independent of
 * this setting — it is always available (unless hidden via `toolbar`) and always
 * acts on the selection.
 */
export type SelectionUI = "menu" | "bar" | "none"

export interface InPlaceConfig {
  /** Which decoration types the in-place canvas renders. Read once, at mount. */
  decorations?: InPlaceDecorationToggles
  /** Table editing mode (see `TableEditing`). Read once, at mount. */
  table?: TableEditing
  /**
   * Marker reveal behaviour (see `RevealMode`). Optional, defaults to
   * `"caret"`. Read once, at mount.
   */
  reveal?: RevealMode
  /**
   * Right-click a block for a context menu (inline actions on a selection,
   * block + insert actions otherwise). `false` keeps the browser's own menu.
   * Defaults to `true`. Read once, at mount.
   */
  contextMenu?: boolean
  /**
   * What a non-empty selection offers (see `SelectionUI`). Defaults to
   * `"menu"`. Read once, at mount.
   */
  selectionUI?: SelectionUI
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
  /**
   * Invoked by the in-place link editor's "Open link" action with the link's
   * `href`. Stylo does not navigate on its own.
   */
  onLinkClick?: (href: string) => void
  /** Configures the in-place canvas (ADR-005). Applied when it mounts. */
  inPlace?: InPlaceConfig
  /**
   * How `preview` (and `split`'s preview pane) shows the leading `---` YAML
   * block. `"hidden"` (default) drops it; `"code"` renders it as a styled
   * `<pre class="stylo-frontmatter">`.
   */
  frontmatter?: FrontmatterDisplay
  /**
   * Grammars for fenced-code sub-highlighting on the CodeMirror surfaces
   * (`source`, `split`, `in-place`). None by default. Read once, at mount.
   */
  codeLanguages?: CodeLanguages
  /**
   * Formatting toolbar above the editing surface (`source`, `in-place`,
   * `split`; never `preview`). Omit or `true` for the default bar, `false` to
   * hide it, or an object to choose and order the buttons. See ADR-002 §2.
   */
  toolbar?: boolean | ToolbarConfig
  /**
   * Replace individual toolbar glyphs, keyed by command id. Any id left out
   * keeps its built-in inline-SVG icon — Stylo ships no icon dependency.
   */
  icons?: Partial<Record<ToolbarCommandId, ReactNode>>
  /** Render the source surface read-only. */
  readOnly?: boolean
  /** Placeholder text shown when the document is empty (source surface). */
  placeholder?: string
  /** Extra class on the root element, alongside the internal classes. */
  className?: string
}
