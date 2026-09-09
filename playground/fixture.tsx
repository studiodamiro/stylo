import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  Stylo,
  type RevealMode,
  type SelectionUI,
  type StyloMode,
  type TableEditing,
} from "../src/index"
import "katex/dist/katex.min.css"

/**
 * Deterministic mount of `<Stylo>` for the Playwright suite (`test/browser/`).
 * Everything is driven by URL query params so a spec controls the surface
 * without touching a control panel:
 *
 *   ?mode=in-place|source|preview|split   (default in-place)
 *   ?selectionUI=menu|bar|none            (default menu)
 *   ?table=source|cells                   (default source)
 *   ?reveal=caret|never                   (default caret)
 *   ?sticky=top|bottom                    (default none)
 *   ?toolbar=0                            (default on)
 *   ?theme=dark                           (default light)
 *   ?doc=basic|math|table|long            (default basic)
 */

const DOCS: Record<string, string> = {
  basic: [
    "# Field notes",
    "",
    "Text can be **bold**, _italic_, or `inline code`, plus a [link](https://codemirror.net).",
    "",
    "A second paragraph so there is a plain line to click into.",
  ].join("\n"),
  math: [
    "# Math",
    "",
    "Inline: $e^{i\\pi} + 1 = 0$.",
    "",
    "$$",
    "\\int_0^1 x^2 \\, dx = \\frac{1}{3}",
    "$$",
  ].join("\n"),
  table: [
    "# Table",
    "",
    "| Surface | Live | Chunk |",
    "| ------- | ---- | ----- |",
    "| source  | no   | no    |",
    "| in-place| yes  | paint |",
  ].join("\n"),
  long: [
    "# Long document",
    "",
    ...Array.from(
      { length: 60 },
      (_, i) => `Paragraph ${i + 1}. Enough lines that the window scrolls.`,
    ),
  ].join("\n"),
}

const params = new URLSearchParams(location.search)
const mode = (params.get("mode") as StyloMode) ?? "in-place"
const selectionUI = (params.get("selectionUI") as SelectionUI) ?? "menu"
const table = (params.get("table") as TableEditing) ?? "source"
const reveal = (params.get("reveal") as RevealMode) ?? "caret"
const sticky = params.get("sticky") as "top" | "bottom" | null
const toolbar = params.get("toolbar") !== "0"
const doc = DOCS[params.get("doc") ?? "basic"] ?? DOCS.basic!

if (params.get("theme") === "dark") document.documentElement.dataset.theme = "dark"

function Fixture() {
  const [value, setValue] = useState(doc)
  return (
    <Stylo
      value={value}
      onChange={setValue}
      mode={mode}
      inPlace={{ selectionUI, table, reveal }}
      toolbar={sticky ? { sticky } : toolbar}
    />
  )
}

const el = document.getElementById("fixture")
if (!el) throw new Error("#fixture not found")
createRoot(el).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
