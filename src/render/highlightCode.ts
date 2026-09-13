import { LanguageDescription, type Language } from "@codemirror/language"
import { highlightTree, tagHighlighter } from "@lezer/highlight"
import { SYNTAX_TAG_GROUPS } from "../editor/highlight"
import type { CodeLanguages } from "../types"

/**
 * `preview`'s counterpart to `src/editor/highlight.ts`'s `styloHighlightStyle`
 * — same `SYNTAX_TAG_GROUPS`, same tags, but emitting plain `stylo-tok-<token>`
 * classes (styled in `stylo.module.css`) instead of a CodeMirror `StyleModule`,
 * since `highlightTree` here runs outside of any `EditorView`.
 */
const previewHighlighter = tagHighlighter(
  SYNTAX_TAG_GROUPS.map(({ tags, token }) => ({ tag: tags, class: `stylo-tok-${token}` })),
)

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" }
const escapeHtml = (text: string) => text.replace(/[&<>]/g, (c) => ESCAPES[c] ?? c)

/**
 * Resolves a fence's language the same way `@codemirror/lang-markdown`
 * resolves `codeLanguages` for the CodeMirror surfaces, so a name that matches
 * on one matches on the other: the function form is called with the name
 * directly, an array is matched fuzzily by `LanguageDescription.matchLanguageName`.
 */
function resolveLanguage(
  name: string,
  codeLanguages: CodeLanguages,
): Language | LanguageDescription | null {
  if (typeof codeLanguages === "function") return codeLanguages(name)
  return LanguageDescription.matchLanguageName(codeLanguages, name, true)
}

/**
 * Tokenizes one fenced code block for `preview`, reusing the exact grammars
 * and colour mapping the in-place canvas's CodeMirror highlighter uses, so a
 * block looks identical whether the note is being read or edited. Returns
 * `null` — the block stays plain, un-highlighted text — when `codeLanguages`
 * has no match for `info`, or the match fails to load.
 */
export async function highlightToHtml(
  code: string,
  info: string,
  codeLanguages: CodeLanguages,
): Promise<string | null> {
  const name = /\S*/.exec(info)?.[0] ?? ""
  if (!name) return null

  const match = resolveLanguage(name, codeLanguages)
  if (!match) return null

  let language: Language
  if (match instanceof LanguageDescription) {
    try {
      language = (await match.load()).language
    } catch {
      return null
    }
  } else {
    language = match
  }

  const tree = language.parser.parse(code)
  let html = ""
  let pos = 0
  highlightTree(tree, previewHighlighter, (from, to, classes) => {
    if (from > pos) html += escapeHtml(code.slice(pos, from))
    html += `<span class="${classes}">${escapeHtml(code.slice(from, to))}</span>`
    pos = to
  })
  if (pos < code.length) html += escapeHtml(code.slice(pos))
  return html
}
