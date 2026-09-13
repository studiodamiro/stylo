import {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import Markdown, { type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkBreaks from "remark-breaks"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { splitFrontmatter } from "../frontmatter"
import styles from "../styles/stylo.module.css"
import type {
  CodeLanguages,
  EmbedSource,
  FrontmatterDisplay,
  ResolveErrorInfo,
  TaskToggleInfo,
} from "../types"
import { CodeBlock } from "./CodeBlock"
import { Embed } from "./Embed"
import { remarkCallout } from "./remark-callout"
import { remarkEmbed } from "./remark-embed"
import { findCheckboxOffsets } from "./taskCheckbox"
import { remarkWikilink } from "./remark-wikilink"

const REHYPE_PLUGINS = [rehypeKatex]

/**
 * Builds the checkbox's `onChange` handler for a rendered `<li>`, or `null`
 * when it isn't an eligible task item — not a task list item at all,
 * `onTaskToggle` unset, no position data, or (a raw-edit race, effectively
 * never) a marker `findCheckboxOffsets` can't locate.
 */
function makeToggleHandler(
  node: { position?: { start: { offset?: number } } } | undefined,
  className: string | undefined,
  value: string,
  onTaskToggle: ((info: TaskToggleInfo) => void) | undefined,
): ((event: ChangeEvent<HTMLInputElement>) => void) | null {
  if (!onTaskToggle || typeof className !== "string" || !className.includes("task-list-item")) {
    return null
  }
  const itemStart = node?.position?.start.offset
  if (itemStart === undefined) return null
  const offsets = findCheckboxOffsets(value, itemStart)
  if (!offsets) return null
  return (event) => onTaskToggle({ ...offsets, checked: event.target.checked })
}

/**
 * A task item's checkbox `<input>` is always the leftmost leaf of its `<li>`
 * — `mdast-util-to-hast` unshifts it onto the first paragraph, itself the
 * first result, whether or not GFM kept that paragraph wrapped (a "loose"
 * list, blank lines between items) or unwrapped it (a "tight" one). Walking
 * only the first-child spine finds it either way without ever wandering into
 * a nested sub-list's own checkbox, which lives as a later sibling, not a
 * descendant of the first child.
 */
function enableLeadingCheckbox(
  node: ReactNode,
  onChange: (event: ChangeEvent<HTMLInputElement>) => void,
): { done: true; node: ReactNode } | { done: false } {
  if (!isValidElement(node)) return { done: false }
  if (node.type === "input") {
    return {
      done: true,
      node: cloneElement(node as ReactElement<Record<string, unknown>>, {
        disabled: false,
        onChange,
      }),
    }
  }
  const kids = Children.toArray((node.props as { children?: ReactNode }).children)
  if (kids.length === 0) return { done: false }
  const result = enableLeadingCheckbox(kids[0], onChange)
  if (!result.done) return { done: false }
  return {
    done: true,
    node: cloneElement(node as ReactElement<{ children?: ReactNode }>, {}, [
      result.node,
      ...kids.slice(1),
    ]),
  }
}

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
  /**
   * Turn a single line ending into a real line break (`<br>`) instead of
   * CommonMark's default — a blank line required to start a new paragraph,
   * otherwise consecutive lines join into one run. Obsidian's Live Preview
   * reads this way. Off by default: every existing `preview` render keeps
   * today's paragraph-joining behaviour unless a host opts in. Has no effect
   * on `in-place` / `source` — CodeMirror already decorates each source line
   * independently there.
   */
  softBreaks?: boolean
  /**
   * Makes task-list checkboxes clickable instead of `disabled`. Fired with
   * raw `value` offsets bracketing the clicked marker and its new state; the
   * host owns splicing `value` and calling its own `onChange`. Off by
   * default — every checkbox stays `disabled`, today's behaviour, until a
   * host opts in.
   */
  onTaskToggle?: (info: TaskToggleInfo) => void
}

/** Rendered Markdown + KaTeX view. A pure function of the string. */
export function Preview({
  value,
  onWikiLinkClick,
  embedSource,
  onResolveError,
  frontmatter = "hidden",
  codeLanguages,
  softBreaks,
  onTaskToggle,
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
      ...(softBreaks ? [remarkBreaks] : []),
      ...(embedSource ? [remarkEmbed] : []),
      remarkWikilink,
      remarkCallout,
    ],
    [embedSource, softBreaks],
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
    li({ node, children, ...rest }) {
      const handleToggle = makeToggleHandler(node, rest.className, value, onTaskToggle)
      if (handleToggle) {
        // A loose list (blank line between items) keeps the `<li>`'s content
        // wrapped in a `<p>`, itself preceded by a formatting `"\n"` text
        // node — skip past that to the first real element.
        const kids = Children.toArray(children)
        const firstElementIndex = kids.findIndex((kid) => isValidElement(kid))
        const enabled =
          firstElementIndex === -1
            ? null
            : enableLeadingCheckbox(kids[firstElementIndex], handleToggle)
        if (enabled?.done) {
          const nextKids: ReactNode[] = kids.map((kid, i) =>
            i === firstElementIndex ? enabled.node : kid,
          )
          return <li {...rest}>{nextKids}</li>
        }
      }
      return <li {...rest}>{children}</li>
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
