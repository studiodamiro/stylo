import { expect, test } from "vitest"
import { renderInline } from "../src/inplace/inline-md"

/** Serialise the rendered fragment to a compact tag+text string for asserting. */
function shape(md: string): string {
  const host = document.createElement("div")
  host.append(renderInline(md))
  const walk = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ""
    const el = n as Element
    if (el.classList.contains("katex") || el.querySelector?.(".katex")) return "{katex}"
    const inner = [...el.childNodes].map(walk).join("")
    return `<${el.tagName.toLowerCase()}>${inner}</${el.tagName.toLowerCase()}>`
  }
  return [...host.childNodes].map(walk).join("")
}

test("plain text passes through untouched", () => {
  expect(shape("just words here")).toBe("just words here")
})

test("bold, italic, strike, code", () => {
  expect(shape("a **b** c")).toBe("a <strong>b</strong> c")
  expect(shape("a *b* c")).toBe("a <em>b</em> c")
  expect(shape("a ~~b~~ c")).toBe("a <span>b</span> c")
  expect(shape("a `b` c")).toBe("a <code>b</code> c")
})

test("*** renders as bold + italic", () => {
  expect(shape("x ***y*** z")).toBe("x <strong><em>y</em></strong> z")
})

test("bold containing code and italic", () => {
  expect(shape("**a `b`** and *c*")).toBe("<strong>a <code>b</code></strong> and <em>c</em>")
})

test("code keeps its contents literal", () => {
  expect(shape("`**not bold**`")).toBe("<code>**not bold**</code>")
})

test("a link renders as <a> with the href and formatted label", () => {
  expect(shape("see [the **docs**](https://x.dev)")).toBe("see <a>the <strong>docs</strong></a>")
})

test("a wikilink collapses to its label and carries the target", () => {
  const host = document.createElement("div")
  host.append(renderInline("go [[api/ref|the API]] now"))
  const w = host.querySelector<HTMLElement>(".cm-inplace-wikilink")!
  expect(w.textContent).toBe("the API")
  expect(w.dataset.styloWikilink).toBe("api/ref")
})

test("inline math renders KaTeX; currency does not", () => {
  expect(shape("mass $E=mc^2$ here")).toBe("mass {katex} here")
  expect(shape("it costs $5 and $10 total")).toBe("it costs $5 and $10 total")
})

test("unclosed marks stay literal", () => {
  expect(shape("a **b c")).toBe("a **b c")
  expect(shape("2 * 3 = 6")).toBe("2 * 3 = 6")
})
