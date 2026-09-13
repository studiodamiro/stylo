import { useEffect, useState } from "react"
import type { CodeLanguages } from "../types"
import { highlightToHtml } from "./highlightCode"

interface CodeBlockProps {
  code: string
  language: string
  codeLanguages: CodeLanguages
  className?: string
}

/**
 * One fenced code block in `preview`. Renders plain text immediately — so
 * there is never a loading flash for something this small — then swaps in
 * `--stylo-syntax-*`-coloured spans once `codeLanguages` resolves and the
 * block's grammar parses. Per-language grammars stay exactly as lazy as they
 * already are for the CodeMirror surfaces (`codeLanguages` is host-supplied),
 * so a `preview`-only consumer never pays for one it never shows.
 */
export function CodeBlock({ code, language, codeLanguages, className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setHtml(null)
    highlightToHtml(code, language, codeLanguages).then((result) => {
      if (live) setHtml(result)
    })
    return () => {
      live = false
    }
  }, [code, language, codeLanguages])

  if (html == null) return <code className={className}>{code}</code>
  // `html` is built in highlightCode.ts from the parsed source text (HTML-escaped)
  // and fixed `stylo-tok-*` class names only — no host or document input reaches it.
  return <code className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
