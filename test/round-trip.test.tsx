import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"

afterEach(cleanup)

// Deliberately dense: frontmatter, both wikilink forms, an embed reference,
// inline and block math, a table, a fenced code block, a thematic break, and
// a callout — every construct with its own decoration layer, in one document.
const FIXTURE = `---
title: Round-trip fixture
tags: [alpha, beta]
---

# Heading

A paragraph with [[Wikilink Target]] and [[Real Target|shown label]] and an
embed ![[Some Note]].

Inline math $x^2 + 1$ and a block:

$$
\\int_0^1 x\\,dx = \\tfrac12
$$

| A   | B   |
| --- | --- |
| 1   | 2   |

\`\`\`js
const x = 1
\`\`\`

---

> [!warning]
> Careful here.
`

test("source mode loads the document unchanged and fires no onChange", () => {
  const onChange = vi.fn()
  const { container } = render(<Stylo value={FIXTURE} onChange={onChange} mode="source" />)

  const view = EditorView.findFromDOM(container.querySelector(".cm-editor") as HTMLElement)
  expect(view?.state.doc.toString()).toBe(FIXTURE)
  expect(onChange).not.toHaveBeenCalled()
})

test("in-place canvas loads the document unchanged and fires no onChange", async () => {
  const onChange = vi.fn()
  const { container } = render(<Stylo value={FIXTURE} onChange={onChange} mode="in-place" />)

  // The in-place surface is a lazy chunk — wait for the editor to attach and
  // its decorations to settle before reading the underlying document back.
  await vi.waitFor(() => {
    if (!container.querySelector(".cm-editor")) throw new Error("not mounted")
  })

  const view = EditorView.findFromDOM(container.querySelector(".cm-editor") as HTMLElement)
  expect(view?.state.doc.toString()).toBe(FIXTURE)
  expect(onChange).not.toHaveBeenCalled()
})
