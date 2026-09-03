import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
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
