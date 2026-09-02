import { Suspense, useState } from "react"
import type { EditorView } from "@codemirror/view"
import { SourceView } from "./editor/SourceView"
import { LazyInPlaceView } from "./inplace/lazyInPlace"
import { LazyPreview } from "./render/lazyPreview"
import { SplitView } from "./SplitView"
import styles from "./styles/stylo.module.css"
import { Toolbar } from "./toolbar/Toolbar"
import { resolveToolbarItems } from "./toolbar/config"
import "./styles/tokens.css"
import type { StyloProps } from "./types"

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
export function Stylo({
  value,
  onChange,
  mode = "in-place",
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
}: StyloProps) {
  const resolved = mode === "preview" || mode === "split" || mode === "in-place" ? mode : "source"

  const [view, setView] = useState<EditorView | null>(null)
  const toolbarItems = resolved === "preview" ? null : resolveToolbarItems(toolbar)

  const rootClass = [styles.root, "stylo", className].filter(Boolean).join(" ")

  return (
    <div className={rootClass} data-stylo-mode={resolved}>
      {toolbarItems && (
        <Toolbar view={view} items={toolbarItems} icons={icons} disabled={readOnly} />
      )}

      {resolved === "source" && (
        <SourceView
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          codeLanguages={codeLanguages}
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
            onViewChange={setView}
          />
        </Suspense>
      )}
    </div>
  )
}
