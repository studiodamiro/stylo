import Markdown, { type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import styles from "../styles/stylo.module.css"
import { remarkWikilink } from "./remark-wikilink"

const REMARK_PLUGINS = [remarkFrontmatter, remarkGfm, remarkMath, remarkWikilink]
const REHYPE_PLUGINS = [rehypeKatex]

export interface PreviewProps {
  value: string
  onWikiLinkClick?: (target: string) => void
}

/** Rendered Markdown + KaTeX view. A pure function of the string. */
export function Preview({ value, onWikiLinkClick }: PreviewProps) {
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
