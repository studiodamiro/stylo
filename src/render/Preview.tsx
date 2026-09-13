import { useMemo } from "react"
import Markdown, { type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { splitFrontmatter } from "../frontmatter"
import styles from "../styles/stylo.module.css"
import type { CodeLanguages, EmbedSource, FrontmatterDisplay, ResolveErrorInfo } from "../types"
import { CodeBlock } from "./CodeBlock"
import { Embed } from "./Embed"
import { remarkCallout } from "./remark-callout"
import { remarkEmbed } from "./remark-embed"
import { remarkWikilink } from "./remark-wikilink"

const REHYPE_PLUGINS = [rehypeKatex]

export interface PreviewProps {
  value: string
  onWikiLinkClick?: (target: string) => void
  /** Resolves `![[ref]]` embeds. Omit and `![[…]]` stays literal. */
  embedSource?: EmbedSource
  /** Notified when `embedSource` rejects; the literal fallback still renders. */
  onResolveError?: (error: unknown, info: ResolveErrorInfo) => void
  /** `"code"` renders the `---` block as a styled `<pre>`; `"hidden"` (default) drops it. */
  frontmatter?: FrontmatterDisplay
  /**
   * Grammars for fenced-code syntax highlighting, matching the CodeMirror
   * surfaces' `codeLanguages` prop exactly (same resolution rules, same
   * `--stylo-syntax-*` colours). Omit and fenced code renders as plain,
   * un-highlighted text — today's behaviour.
   */
  codeLanguages?: CodeLanguages
}

/** Rendered Markdown + KaTeX view. A pure function of the string. */
export function Preview({
  value,
  onWikiLinkClick,
  embedSource,
  onResolveError,
  frontmatter = "hidden",
  codeLanguages,
}: PreviewProps) {
  const fm = frontmatter === "code" ? splitFrontmatter(value) : null

  // `remarkEmbed` must precede `remarkWikilink` (it consumes the `![[…]]` before
  // the inner `[[…]]` is rewritten) and is only in the pipeline when the host
  // opts in, so a bare `![[x]]` renders unchanged otherwise.
  const remarkPlugins = useMemo(
    () => [
      remarkFrontmatter,
      remarkGfm,
      remarkMath,
      ...(embedSource ? [remarkEmbed] : []),
      remarkWikilink,
      remarkCallout,
    ],
    [embedSource],
  )

  const components: Components = {
    a({ node: _node, children, ...rest }) {
      const target = (rest as Record<string, unknown>)["data-wikilink"]
      if (typeof target === "string") {
        return (
          <a
            {...rest}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              onWikiLinkClick?.(target)
            }}
          >
            {children}
          </a>
        )
      }
      return (
        <a {...rest} rel="noreferrer">
          {children}
        </a>
      )
    },
    div({ node: _node, children, ...rest }) {
      const reference = (rest as Record<string, unknown>)["data-stylo-embed"]
      if (typeof reference === "string" && embedSource) {
        return (
          <div {...rest}>
            <Embed reference={reference} source={embedSource} onError={onResolveError} />
          </div>
        )
      }
      return <div {...rest}>{children}</div>
    },
    span({ node: _node, children, ...rest }) {
      const reference = (rest as Record<string, unknown>)["data-stylo-embed-inline"]
      if (typeof reference === "string" && embedSource) {
        return (
          <span {...rest}>
            <Embed reference={reference} source={embedSource} onError={onResolveError} inline />
          </span>
        )
      }
      return <span {...rest}>{children}</span>
    },
    code({ node: _node, className, children, ...rest }) {
      const language = /language-(\w+)/.exec(className || "")?.[1]
      if (language && codeLanguages) {
        return (
          <CodeBlock
            className={className}
            language={language}
            code={String(children).replace(/\n$/, "")}
            codeLanguages={codeLanguages}
          />
        )
      }
      return (
        <code {...rest} className={className}>
          {children}
        </code>
      )
    },
  }

  return (
    <div className={styles.preview}>
      {fm && <div className="stylo-frontmatter">{fm.frontmatter}</div>}
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {value}
      </Markdown>
    </div>
  )
}
