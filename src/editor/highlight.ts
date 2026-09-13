import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags as t, type Tag } from "@lezer/highlight"

/**
 * One row per `--stylo-syntax-*` token: which Lezer tags map to it, and
 * whether it reads italic. This is the single source of truth for fenced-code
 * colour — `styloHighlightStyle` below builds the live CodeMirror extension
 * from it, and `src/render/highlightCode.ts` builds `preview`'s tree-walking
 * highlighter (a `tagHighlighter` emitting `stylo-tok-<token>` classes,
 * styled in `stylo.module.css`) from the same list, so both surfaces agree by
 * construction rather than by two hand-kept mappings staying in sync.
 *
 * `token` doubles as the `--stylo-syntax-<token>` suffix and the
 * `stylo-tok-<token>` class suffix. `meta` shares its colour with `comment`
 * but isn't italic, so it gets its own row rather than merging into it.
 */
export interface SyntaxTagGroup {
  token: string
  tags: Tag[]
  italic?: boolean
}

export const SYNTAX_TAG_GROUPS: SyntaxTagGroup[] = [
  {
    token: "keyword",
    tags: [
      t.keyword,
      t.modifier,
      t.controlKeyword,
      t.operatorKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
    ],
  },
  { token: "string", tags: [t.string, t.special(t.string), t.regexp, t.attributeValue] },
  { token: "escape", tags: [t.escape, t.character] },
  {
    token: "comment",
    tags: [t.comment, t.lineComment, t.blockComment, t.docComment],
    italic: true,
  },
  { token: "number", tags: [t.number, t.integer, t.float] },
  { token: "constant", tags: [t.bool, t.null, t.atom, t.constant(t.name)] },
  {
    token: "function",
    tags: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
  },
  { token: "type", tags: [t.typeName, t.className, t.namespace] },
  { token: "property", tags: [t.propertyName, t.attributeName] },
  { token: "tag", tags: [t.tagName] },
  { token: "meta", tags: [t.meta, t.annotation] },
  { token: "invalid", tags: [t.invalid] },
]

/**
 * Token colours for fenced code and any other embedded-language grammar.
 *
 * Every colour resolves to a `--stylo-syntax-*` custom property, so the host
 * restyles code the same way as the rest of the `--stylo-*` palette; the values
 * in `tokens.css` are the defaults. Both `@codemirror/language` and
 * `@lezer/highlight` are already transitive dependencies of
 * `@codemirror/lang-markdown`, so this adds no package weight.
 *
 * Markdown's own structural tokens (heading marks, emphasis markers, link
 * brackets) are deliberately left undefined: the in-place canvas styles those
 * with decorations, and `source` mode keeps its plain, un-tinted look. Only
 * tokens that come from a real programming-language parser get a colour.
 */
export const styloHighlightStyle = HighlightStyle.define(
  SYNTAX_TAG_GROUPS.map(({ tags, token, italic }) => ({
    tag: tags,
    color: `var(--stylo-syntax-${token === "meta" ? "comment" : token})`,
    ...(italic ? { fontStyle: "italic" } : {}),
  })),
)

/** The highlight style wrapped as an editor extension. */
export const styloHighlighting = syntaxHighlighting(styloHighlightStyle)
