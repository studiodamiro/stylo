import { forwardRef, Suspense, useEffect, useImperativeHandle, useRef, useState } from "react"
import { EditorView } from "@codemirror/view"
import { SourceView } from "./editor/SourceView"
import { LazyInPlaceView } from "./inplace/lazyInPlace"
import { LazyPreview } from "./render/lazyPreview"
import { SplitView } from "./SplitView"
import styles from "./styles/stylo.module.css"
import { Toolbar } from "./toolbar/Toolbar"
import { resolveToolbarItems } from "./toolbar/config"
import { splitFrontmatter } from "./frontmatter"
import "./styles/tokens.css"
import type { StyloHandle, StyloProps } from "./types"

/**
 * Plain-text-first Markdown editor. `value` is the canonical Markdown string;
 * every view is a pure function of it.
 *
 * The default `mode` is `in-place`, the live decoration canvas (ADR-002 §1,
 * ADR-004). Pass `mode="source"` for the plain surface with no lazy render
 * chunk. `preview` and `split` are also available.
 *
 * A formatting `toolbar` sits above every editing surface (all modes but
 * `preview`); pass `toolbar={false}` to drop it or a `ToolbarConfig` to trim it.
 */
export const Stylo = forwardRef<StyloHandle, StyloProps>(function Stylo(
  {
    value,
    onChange,
    mode = "in-place",
    onSave,
    onFrontmatter,
    onWikiLinkClick,
    onLinkClick,
    readOnly,
    placeholder,
    className,
    inPlace,
    codeLanguages,
    toolbar,
    icons,
    frontmatter,
  },
  ref,
) {
  const resolved = mode === "preview" || mode === "split" || mode === "in-place" ? mode : "source"

  const [view, setView] = useState<EditorView | null>(null)
  const toolbarItems = resolved === "preview" ? null : resolveToolbarItems(toolbar)
  const toolbarRender = toolbar && typeof toolbar === "object" ? toolbar.render : undefined
  const stickyConfig = toolbar && typeof toolbar === "object" ? toolbar.sticky : undefined
  const stickyToolbar: "top" | "bottom" | false =
    stickyConfig === "top" ? "top" : stickyConfig ? "bottom" : false

  // Report the raw frontmatter block on mount and whenever it changes. Stylo
  // does not parse it — the host passes `raw` to its own YAML parser.
  const onFrontmatterRef = useRef(onFrontmatter)
  onFrontmatterRef.current = onFrontmatter
  const lastFrontmatter = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const raw = splitFrontmatter(value)?.frontmatter ?? null
    if (raw === lastFrontmatter.current) return
    lastFrontmatter.current = raw
    onFrontmatterRef.current?.(raw)
  }, [value])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => view?.focus(),
      getView: () => view,
      insertAtCursor: (md) => {
        if (!view) return
        view.dispatch(view.state.replaceSelection(md))
        view.focus()
      },
      scrollToHeading: (text) => {
        if (!view) return false
        const target = text.trim().toLowerCase()
        const { doc } = view.state
        for (let n = 1; n <= doc.lines; n++) {
          const line = doc.line(n)
          const m = /^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line.text)
          if (!m || m[1] === undefined) continue
          if (m[1].trim().toLowerCase() !== target) continue
          view.dispatch({
            selection: { anchor: line.from },
            effects: EditorView.scrollIntoView(line.from, { y: "start" }),
          })
          view.focus()
          return true
        }
        return false
      },
    }),
    [view],
  )

  const rootClass = [
    styles.root,
    stickyToolbar === "bottom" && styles.stickyToolbarRootBottom,
    stickyToolbar === "top" && styles.stickyToolbarRootTop,
    "stylo",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass} data-stylo-mode={resolved}>
      {toolbarItems &&
        (() => {
          const bar = (
            <Toolbar
              view={view}
              items={toolbarItems}
              icons={icons}
              disabled={readOnly}
              sticky={stickyToolbar}
            />
          )
          return toolbarRender ? toolbarRender(bar, { view }) : bar
        })()}

      {resolved === "source" && (
        <SourceView
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          codeLanguages={codeLanguages}
          onSave={onSave}
          onViewChange={setView}
        />
      )}

      {resolved === "preview" && (
        <Suspense fallback={<div className={styles.preview} aria-busy="true" />}>
          <LazyPreview value={value} onWikiLinkClick={onWikiLinkClick} frontmatter={frontmatter} />
        </Suspense>
      )}

      {resolved === "split" && (
        <SplitView
          value={value}
          onChange={onChange}
          onWikiLinkClick={onWikiLinkClick}
          readOnly={readOnly}
          placeholder={placeholder}
          codeLanguages={codeLanguages}
          frontmatter={frontmatter}
          onSave={onSave}
          onViewChange={setView}
        />
      )}

      {resolved === "in-place" && (
        <Suspense fallback={<div className={styles.inplace} aria-busy="true" />}>
          <LazyInPlaceView
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            onWikiLinkClick={onWikiLinkClick}
            onLinkClick={onLinkClick}
            inPlace={inPlace}
            codeLanguages={codeLanguages}
            onSave={onSave}
            onViewChange={setView}
          />
        </Suspense>
      )}
    </div>
  )
})

Stylo.displayName = "Stylo"
