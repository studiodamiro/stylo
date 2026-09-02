import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"

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
export const styloHighlightStyle = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.modifier,
      t.controlKeyword,
      t.operatorKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
    ],
    color: "var(--stylo-syntax-keyword)",
  },
  {
    tag: [t.string, t.special(t.string), t.regexp, t.attributeValue],
    color: "var(--stylo-syntax-string)",
  },
  { tag: [t.escape, t.character], color: "var(--stylo-syntax-escape)" },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: "var(--stylo-syntax-comment)",
    fontStyle: "italic",
  },
  { tag: [t.number, t.integer, t.float], color: "var(--stylo-syntax-number)" },
  { tag: [t.bool, t.null, t.atom, t.constant(t.name)], color: "var(--stylo-syntax-constant)" },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    color: "var(--stylo-syntax-function)",
  },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--stylo-syntax-type)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--stylo-syntax-property)" },
  { tag: [t.tagName], color: "var(--stylo-syntax-tag)" },
  { tag: [t.meta, t.annotation], color: "var(--stylo-syntax-comment)" },
  { tag: [t.invalid], color: "var(--stylo-syntax-invalid)" },
])

/** The highlight style wrapped as an editor extension. */
export const styloHighlighting = syntaxHighlighting(styloHighlightStyle)
