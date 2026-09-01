import { Suspense } from "react"
import { SourceView } from "./editor/SourceView"
import { LazyInPlaceView } from "./inplace/lazyInPlace"
import { LazyPreview } from "./render/lazyPreview"
import { SplitView } from "./SplitView"
import styles from "./styles/stylo.module.css"
import "./styles/tokens.css"
import type { StyloProps } from "./types"

/**
 * Plain-text-first Markdown editor. `value` is the canonical Markdown string;
 * every view is a pure function of it.
 *
 * The default `mode` is `in-place`, the live decoration canvas (ADR-002 §1,
 * ADR-004). Pass `mode="source"` for the plain surface with no lazy render
 * chunk. `preview` and `split` are also available.
 */
export function Stylo({
  value,
  onChange,
  mode = "in-place",
  onWikiLinkClick,
  readOnly,
  placeholder,
  className,
}: StyloProps) {
  const resolved = mode === "preview" || mode === "split" || mode === "in-place" ? mode : "source"

  const rootClass = [styles.root, "stylo", className].filter(Boolean).join(" ")

  return (
    <div className={rootClass} data-stylo-mode={resolved}>
      {resolved === "source" && (
        <SourceView
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      )}

      {resolved === "preview" && (
        <Suspense fallback={<div className={styles.preview} aria-busy="true" />}>
          <LazyPreview value={value} onWikiLinkClick={onWikiLinkClick} />
        </Suspense>
      )}

      {resolved === "split" && (
        <SplitView
          value={value}
          onChange={onChange}
          onWikiLinkClick={onWikiLinkClick}
          readOnly={readOnly}
          placeholder={placeholder}
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
          />
        </Suspense>
      )}
    </div>
  )
}
