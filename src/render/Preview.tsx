import Markdown, { type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { splitFrontmatter } from "../frontmatter"
import styles from "../styles/stylo.module.css"
import type { FrontmatterDisplay } from "../types"
import { remarkWikilink } from "./remark-wikilink"

const REMARK_PLUGINS = [remarkFrontmatter, remarkGfm, remarkMath, remarkWikilink]
const REHYPE_PLUGINS = [rehypeKatex]

export interface PreviewProps {
  value: string
  onWikiLinkClick?: (target: string) => void
  /** `"code"` renders the `---` block as a styled `<pre>`; `"hidden"` (default) drops it. */
  frontmatter?: FrontmatterDisplay
}

/** Rendered Markdown + KaTeX view. A pure function of the string. */
export function Preview({ value, onWikiLinkClick, frontmatter = "hidden" }: PreviewProps) {
  const fm = frontmatter === "code" ? splitFrontmatter(value) : null
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
  }

  return (
    <div className={styles.preview}>
      {fm && <div className="stylo-frontmatter">{fm.frontmatter}</div>}
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {value}
      </Markdown>
    </div>
  )
}
