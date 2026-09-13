import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Preview } from "../src/render/Preview"

afterEach(cleanup)

test("renders GFM and keeps YAML frontmatter out of the body", () => {
  const md = [
    "---",
    "title: Hidden",
    "---",
    "",
    "# Head",
    "",
    "| a | b |",
    "| - | - |",
    "| 1 | 2 |",
  ].join("\n")
  const { container } = render(<Preview value={md} />)

  expect(container.querySelector("h1")?.textContent).toBe("Head")
  expect(container.querySelector("table")).not.toBeNull()
  expect(container.textContent).not.toContain("title: Hidden")
})

test("a table renders wrapped in .stylo-table-wrap, so a host's width on <table> reaches a real table-layout box", () => {
  const md = ["| a | b |", "| - | - |", "| 1 | 2 |"].join("\n")
  const { container } = render(<Preview value={md} />)

  const wrap = container.querySelector(".stylo-table-wrap")
  expect(wrap).not.toBeNull()
  const table = wrap!.querySelector("table")
  expect(table).not.toBeNull()
  expect(table!.parentElement).toBe(wrap)
})

test('frontmatter="code" renders the raw block under a stable class', () => {
  const md = "---\ntitle: Shown\ntags: [x]\n---\n\n# Head"
  const { container } = render(<Preview value={md} frontmatter="code" />)

  const block = container.querySelector(".stylo-frontmatter")
  expect(block?.textContent).toBe("title: Shown\ntags: [x]")
  expect(container.querySelector("h1")?.textContent).toBe("Head")
  // still not duplicated into the rendered body
  expect(container.querySelector("h1")?.textContent).not.toContain("title")
})

test("frontmatter defaults to hidden even with a block present", () => {
  const { container } = render(<Preview value={"---\nk: v\n---\n\nbody"} />)
  expect(container.querySelector(".stylo-frontmatter")).toBeNull()
})

test("typesets inline math with KaTeX", () => {
  const { container } = render(<Preview value="Euler: $e^{i\\pi} + 1 = 0$" />)
  expect(container.querySelector(".katex")).not.toBeNull()
})

test("an Obsidian callout renders as a classed box with the token stripped", () => {
  const { container } = render(<Preview value={"> [!warning] Careful\n> mind the gap"} />)
  const box = container.querySelector("blockquote.stylo-callout")
  expect(box).not.toBeNull()
  expect(box!.classList.contains("stylo-callout-warn")).toBe(true)
  expect(box!.getAttribute("data-callout")).toBe("warning")
  expect(box!.textContent).toContain("Careful")
  expect(box!.textContent).not.toContain("[!warning]")
})

test("a plain blockquote is left untouched", () => {
  const { container } = render(<Preview value="> just a quote" />)
  expect(container.querySelector("blockquote.stylo-callout")).toBeNull()
  expect(container.querySelector("blockquote")).not.toBeNull()
})

test("renders [[wikilink]] as a link and calls the handler on click", () => {
  const onWikiLinkClick = vi.fn()
  const { container } = render(<Preview value="see [[Note]]" onWikiLinkClick={onWikiLinkClick} />)

  const link = container.querySelector<HTMLAnchorElement>("a[data-wikilink='Note']")
  expect(link).not.toBeNull()
  expect(link?.textContent).toBe("Note")

  link?.click()
  expect(onWikiLinkClick).toHaveBeenCalledWith("Note")
})

test("[[target|label]] shows the label, reports the target", () => {
  const onWikiLinkClick = vi.fn()
  const { container } = render(
    <Preview value="[[Real Target|Shown]]" onWikiLinkClick={onWikiLinkClick} />,
  )

  const link = container.querySelector<HTMLAnchorElement>("a[data-wikilink='Real Target']")
  expect(link?.textContent).toBe("Shown")

  link?.click()
  expect(onWikiLinkClick).toHaveBeenCalledWith("Real Target")
})

test("a lone ![[ref]] renders the node embedSource returns, called with the raw ref", async () => {
  const embedSource = vi.fn((ref: string) => <p data-testid="embed">resolved: {ref}</p>)
  render(<Preview value={"intro\n\n![[Weekly note#Tasks]]\n\nafter"} embedSource={embedSource} />)

  const slot = await screen.findByTestId("embed")
  expect(slot.textContent).toBe("resolved: Weekly note#Tasks")
  expect(embedSource).toHaveBeenCalledWith("Weekly note#Tasks")
  expect(slot.closest(".stylo-embed")).not.toBeNull()
})

test("an async embedSource is awaited", async () => {
  const embedSource = (ref: string) =>
    Promise.resolve(<span data-testid="late">{ref.toUpperCase()}</span>)
  render(<Preview value="![[note]]" embedSource={embedSource} />)

  expect((await screen.findByTestId("late")).textContent).toBe("NOTE")
})

test("without embedSource, ![[ref]] is not turned into an embed", () => {
  const { container } = render(<Preview value="![[note]]" />)
  expect(container.querySelector(".stylo-embed")).toBeNull()
  expect(container.querySelector(".stylo-embed-content")).toBeNull()
})

test("embedSource returning null leaves the literal reference in place", async () => {
  const { container } = render(<Preview value="![[note]]" embedSource={() => null} />)
  expect(await screen.findByText("![[note]]")).toBeDefined()
  expect(container.querySelector(".stylo-embed-content")).toBeNull()
})

test("an ![[ref]] inside other text renders as an inline embed, text preserved around it", async () => {
  const embedSource = vi.fn((ref: string) => <b data-testid="inl">{ref}</b>)
  const { container } = render(
    <Preview value="see ![[note]] and ![[two]] inline" embedSource={embedSource} />,
  )

  const inls = await screen.findAllByTestId("inl")
  expect(inls.map((n) => n.textContent)).toEqual(["note", "two"])
  // Rendered inside a <span>, not a block <div>, with surrounding text intact.
  const span = container.querySelector("span[data-stylo-embed-inline='note']")
  expect(span?.querySelector(".stylo-embed-inline")).not.toBeNull()
  expect(container.querySelector("p")?.textContent).toBe("see note and two inline")
  expect(embedSource).toHaveBeenCalledWith("note")
})

test("![[ref]] inside inline code stays literal", () => {
  const embedSource = vi.fn(() => <span>x</span>)
  const { container } = render(<Preview value={"a `![[note]]` b"} embedSource={embedSource} />)
  expect(embedSource).not.toHaveBeenCalled()
  expect(container.querySelector("[data-stylo-embed-inline]")).toBeNull()
})

test("a rejected embedSource falls back to literal text and reports through onResolveError", async () => {
  const onResolveError = vi.fn()
  const boom = new Error("vault offline")
  render(
    <Preview
      value="![[Broken ref]]"
      embedSource={() => Promise.reject(boom)}
      onResolveError={onResolveError}
    />,
  )

  expect(await screen.findByText("![[Broken ref]]")).toBeDefined()
  expect(onResolveError).toHaveBeenCalledWith(boom, {
    source: "embedSource",
    input: "Broken ref",
  })
})

test("embedSource returning null does not fire onResolveError", async () => {
  const onResolveError = vi.fn()
  render(<Preview value="![[q]]" embedSource={() => null} onResolveError={onResolveError} />)
  expect(await screen.findByText("![[q]]")).toBeDefined()
  expect(onResolveError).not.toHaveBeenCalled()
})

test("embedSource is resolved once across a remount, and re-mounts show no loading flash", async () => {
  const embedSource = vi.fn((ref: string) => <p data-testid="cached">once: {ref}</p>)
  const doc = "![[cache me]]"

  const first = render(<Preview value={doc} embedSource={embedSource} />)
  await screen.findByTestId("cached")
  first.unmount()

  const second = render(<Preview value={doc} embedSource={embedSource} />)
  // Served synchronously from cache — present on the first paint, no `aria-busy`.
  expect(second.container.querySelector("[data-testid='cached']")).not.toBeNull()
  expect(second.container.querySelector("[aria-busy='true']")).toBeNull()
  expect(embedSource).toHaveBeenCalledTimes(1)
})

test("softBreaks defaults to false: consecutive lines join into one paragraph", () => {
  const { container } = render(<Preview value={"line one\nline two"} />)
  const paragraph = container.querySelector("p")
  expect(paragraph?.querySelector("br")).toBeNull()
  expect(paragraph?.textContent).toBe("line one\nline two")
})

test("softBreaks turns a single line ending into a <br>", () => {
  const { container } = render(<Preview value={"line one\nline two"} softBreaks />)
  const paragraph = container.querySelector("p")
  expect(paragraph?.querySelector("br")).not.toBeNull()
})

test("softBreaks leaves a fenced code block's internal newlines untouched", () => {
  const md = ["```", "line one", "line two", "```"].join("\n")
  const { container } = render(<Preview value={md} softBreaks />)
  const code = container.querySelector("pre code")
  expect(code?.querySelector("br")).toBeNull()
  expect(code?.textContent).toBe("line one\nline two\n")
})

test("a normal link is left alone and does not trigger the wikilink handler", () => {
  const onWikiLinkClick = vi.fn()
  const { container } = render(
    <Preview value="[ext](https://example.com)" onWikiLinkClick={onWikiLinkClick} />,
  )

  const link = container.querySelector<HTMLAnchorElement>("a[href='https://example.com']")
  expect(link).not.toBeNull()
  expect(link?.getAttribute("rel")).toContain("noreferrer")

  link?.click()
  expect(onWikiLinkClick).not.toHaveBeenCalled()
})
