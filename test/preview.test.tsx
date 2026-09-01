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

test("typesets inline math with KaTeX", () => {
  const { container } = render(<Preview value="Euler: $e^{i\\pi} + 1 = 0$" />)
  expect(container.querySelector(".katex")).not.toBeNull()
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
