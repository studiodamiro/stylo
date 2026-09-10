// A throwaway downstream consumer, type-checked and built against the *packed*
// package (see scripts/smoke-package.mjs). It exercises the public surface — the
// `exports` map, every exported type, the imperative handle, both CSS entries —
// so a broken `exports`, a missing `.d.ts`, an accidental hard dependency, or a
// React-19-only type in the published `.d.ts` fails CI here rather than in a real
// project. Pinned to `@types/react@18` to hold the `>=18` peer range honest.
import { StrictMode, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  Stylo,
  splitFrontmatter,
  type CodeLanguages,
  type EmbedSource,
  type InPlaceConfig,
  type ResolveErrorInfo,
  type StyloHandle,
  type StyloMode,
  type StyloProps,
  type ToolbarConfig,
  type WikiLinkSource,
} from "@damiro/stylo"
import "@damiro/stylo/styles.css"
import "@damiro/stylo/katex.css"

const wikiLinkSource: WikiLinkSource = (q) => [{ target: `Note ${q}`, label: q }]
const embedSource: EmbedSource = (ref) => <div>embed {ref}</div>
const codeLanguages: CodeLanguages = () => null
const inPlace: InPlaceConfig = {
  decorations: { embeds: true },
  reveal: "caret",
  table: "cells",
  selectionUI: "bar",
}
const toolbar: ToolbarConfig = { items: ["bold", "italic", "|", "link"], sticky: "top" }

function onResolveError(error: unknown, info: ResolveErrorInfo) {
  console.error(info.source, info.input, error)
}

function App() {
  const [doc, setDoc] = useState("---\ntitle: x\n---\n\n# Hi\n\n$e^{i\\pi}+1=0$\n\n![[X]]\n")
  const ref = useRef<StyloHandle>(null)
  const modes: StyloMode[] = ["in-place", "source", "preview", "split"]

  const shared: Partial<StyloProps> = {
    value: doc,
    onChange: setDoc,
    wikiLinkSource,
    embedSource,
    codeLanguages,
    inPlace,
    toolbar,
    onResolveError,
    onFrontmatter: (raw) => void raw,
    onWikiLinkClick: (t) => void t,
  }

  const fm = splitFrontmatter(doc)

  return (
    <>
      <button onClick={() => ref.current?.focus()}>focus</button>
      <button onClick={() => ref.current?.insertAtCursor("x")}>insert</button>
      <button onClick={() => ref.current?.scrollToHeading("Hi")}>scroll</button>
      <pre>{fm ? fm.frontmatter : "no frontmatter"}</pre>
      {modes.map((mode) => (
        <div key={mode} style={{ height: 240 }}>
          <Stylo
            ref={mode === "in-place" ? ref : undefined}
            mode={mode}
            {...(shared as StyloProps)}
          />
        </div>
      ))}
    </>
  )
}

const el = document.getElementById("root")
if (el)
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
