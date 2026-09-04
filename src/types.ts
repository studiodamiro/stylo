import type { ReactNode } from "react"
import type { Language, LanguageDescription } from "@codemirror/language"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

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
  | "save"
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

/**
 * A consumer-supplied toolbar button. Mixed into `ToolbarConfig["items"]`
 * alongside the built-in ids. It runs against the same live `EditorView` the
 * built-ins do; `isActive` / `disabled` are read back from the state on every
 * selection, key, and pointer change, exactly like a built-in.
 *
 * No `keys` field: built-in shortcuts are compiled into CodeMirror's keymap at
 * editor construction, so a custom binding would need its own keymap. Bind it
 * yourself against `getView()` for now.
 */
export interface ToolbarCustomItem {
  /**
   * Stable identity, also the React key. Must not collide with a built-in id
   * (`bold`, `h1`, …) or another custom item.
   */
  id: string
  /** Tooltip and accessible label. */
  title: string
  /** Button content — an inline SVG, a glyph, a short label. */
  icon: ReactNode
  /** Run against the live view. The return value is ignored. */
  run: (view: EditorView) => void
  /** Reflected as the button's pressed state (`aria-pressed`, `data-active`). */
  isActive?: (state: EditorState) => boolean
  /** When true, the button is rendered `disabled`. */
  disabled?: (state: EditorState) => boolean
}

/** One rendered slot: a built-in id, a `"|"` separator, or a custom button. */
export type ToolbarItem = ToolbarCommandId | "|" | ToolbarCustomItem

export interface ToolbarConfig {
  /**
   * Ordered toolbar slots — built-in command ids, `"|"` separators, and
   * {@link ToolbarCustomItem} objects, in any order. Omit for the full default
   * bar.
   */
  items?: ToolbarItem[]
  /**
   * Wrap or replace the rendered bar. `bar` is the built-in
   * `<div role="toolbar">` element; return it wrapped, with extra chrome
   * appended, or ignore it entirely and return your own. `view` is `null` until
   * the surface has mounted.
   */
  render?: (bar: ReactNode, ctx: { view: EditorView | null }) => ReactNode
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

/**
 * The right-click menu's top-level groups. `link` is the internal / external
 * link field rows; `format` the inline-mark submenu; `paragraph` the block-type
 * submenu; `insert` the new-block submenu; `clipboard` cut / copy / paste.
 */
export type MenuGroupId = "link" | "format" | "paragraph" | "insert" | "clipboard"

export interface ContextMenuConfig {
  /**
   * Which top-level groups the menu shows, in order. Omit for all five in their
   * default order. `link` and `format` still yield to `selectionUI` when it is
   * not `"menu"` (they move to the floating bar / toolbar).
   */
  groups?: MenuGroupId[]
}

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
   * block + insert actions otherwise). `false` keeps the browser's own menu; an
   * object picks and orders the menu's groups. Defaults to `true`. Read once,
   * at mount.
   */
  contextMenu?: boolean | ContextMenuConfig
  /**
   * What a non-empty selection offers (see `SelectionUI`). Defaults to
   * `"menu"`. Read once, at mount.
   */
  selectionUI?: SelectionUI
  /**
   * Which buttons the floating selection bar shows (`selectionUI: "bar"`), in
   * order. Any of `bold` / `italic` / `strike` / `code` / `link` / `wikilink` /
   * `math`. Omit for all seven. Read once, at mount.
   */
  selectionBarItems?: ToolbarCommandId[]
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
  /**
   * Called with the full Markdown string when `Mod-s` is pressed on any editing
   * surface; the browser's own save dialog is then suppressed. Omit it and
   * `Mod-s` keeps its default browser behaviour. Stylo holds no dirty state —
   * `value` is yours, so compare it against your last-saved copy.
   */
  onSave?: (value: string) => void
  /**
   * Called on mount and whenever the leading `---` YAML block changes, with its
   * inner text (no fences), or `null` when there is no block. Stylo does not
   * parse it — pass `raw` to your own YAML parser for a structured panel. The
   * same split is available synchronously as the exported `splitFrontmatter`.
   */
  onFrontmatter?: (raw: string | null) => void
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

/**
 * Imperative handle exposed on a `ref` to `<Stylo>`. Every method is a no-op —
 * returning `null` / `false` where it has a return value — in `preview` mode or
 * before the editing surface has mounted, since there is no editor then.
 */
export interface StyloHandle {
  /** Move keyboard focus into the editing surface. */
  focus(): void
  /**
   * Put the caret at the start of the first ATX heading (`#` … `######`) whose
   * text matches `text` (trimmed, case-insensitive) and scroll it to the top of
   * the viewport. Returns `true` when a heading matched.
   */
  scrollToHeading(text: string): boolean
  /**
   * Replace the current selection — or insert at the caret when the selection is
   * empty — with `md`. No effect on a `readOnly` surface.
   */
  insertAtCursor(md: string): void
  /**
   * The underlying CodeMirror `EditorView`, or `null` in `preview` mode or
   * before mount. An escape hatch: not covered by semver.
   */
  getView(): EditorView | null
}
