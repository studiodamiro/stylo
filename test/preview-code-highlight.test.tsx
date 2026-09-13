import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { languages } from "@codemirror/language-data"
import { Preview } from "../src/render/Preview"

afterEach(cleanup)

const md = ["```js", "const x = 1 // note", "```"].join("\n")

test("without codeLanguages, a fenced block stays plain text", async () => {
  const { container } = render(<Preview value={md} />)
  const code = container.querySelector("pre code")
  expect(code?.textContent).toBe("const x = 1 // note\n")
  expect(container.querySelector("[class*='stylo-tok-']")).toBeNull()
})

test("with codeLanguages, a fenced block resolves and colours its tokens", async () => {
  const { container } = render(<Preview value={md} codeLanguages={languages} />)

  await screen.findByText("const")
  const code = container.querySelector("pre code")!
  expect(code.textContent).toBe("const x = 1 // note")
  expect(code.querySelector(".stylo-tok-keyword")?.textContent).toBe("const")
  expect(code.querySelector(".stylo-tok-comment")?.textContent).toBe("// note")
})

test("an unresolvable language name falls back to plain text", async () => {
  const doc = ["```not-a-real-language", "hello", "```"].join("\n")
  const { container } = render(<Preview value={doc} codeLanguages={languages} />)

  await screen.findByText("hello")
  expect(container.querySelector("[class*='stylo-tok-']")).toBeNull()
})

test("the function form of codeLanguages is called with the fence's language name", async () => {
  const resolver = vi.fn(() => null)
  render(<Preview value={md} codeLanguages={resolver} />)

  await vi.waitFor(() => expect(resolver).toHaveBeenCalledWith("js"))
})

test("inline code is never routed through the highlighter", () => {
  const { container } = render(<Preview value="see `const x = 1`" codeLanguages={languages} />)
  const code = container.querySelector("code")!
  expect(code.textContent).toBe("const x = 1")
  expect(code.querySelector(".stylo-tok-keyword")).toBeNull()
})
