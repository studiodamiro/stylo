import { useRef } from "react"
import { SourceView } from "./editor/SourceView"
import { Preview } from "./render/Preview"
import styles from "./styles/stylo.module.css"
import "./styles/tokens.css"
import type { StyloProps } from "./types"

/**
 * Plain-text-first Markdown editor. `value` is the canonical Markdown string;
 * every view is a pure function of it.
 *
 * This milestone implements `source` and `preview`; `in-place` / `split` fall
 * back to `source` for now.
 */
export function Stylo({
  value,
  onChange,
  mode = "source", // TODO(ADR-002): default becomes "in-place"
  onWikiLinkClick,
  readOnly,
  placeholder,
  className,
}: StyloProps) {
  const warned = useRef(false)

  let resolved: "source" | "preview" = "source"
  if (mode === "preview") {
    resolved = "preview"
  } else if (mode !== "source" && !warned.current) {
    warned.current = true
    console.warn(`[stylo] mode="${mode}" is not implemented yet; using "source".`)
  }

  const rootClass = [styles.root, "stylo", className].filter(Boolean).join(" ")

  return (
    <div className={rootClass} data-stylo-mode={resolved}>
      {resolved === "source" ? (
        <SourceView
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      ) : (
        <Preview value={value} onWikiLinkClick={onWikiLinkClick} />
      )}
    </div>
  )
}
