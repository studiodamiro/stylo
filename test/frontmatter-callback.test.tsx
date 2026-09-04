import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { Stylo } from "../src/Stylo"
import { splitFrontmatter } from "../src/frontmatter"

afterEach(cleanup)

const FM = "---\ntitle: A\ntags: [x]\n---\n\n# Body\n"

test("onFrontmatter fires once on mount with the raw block", () => {
  const spy = vi.fn()
  render(<Stylo value={FM} onChange={() => {}} mode="source" onFrontmatter={spy} />)
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith("title: A\ntags: [x]")
})

test("onFrontmatter fires with null when there is no block", () => {
  const spy = vi.fn()
  render(<Stylo value="# just a body" onChange={() => {}} mode="source" onFrontmatter={spy} />)
  expect(spy).toHaveBeenCalledWith(null)
})

test("onFrontmatter fires on a frontmatter edit but not a body-only edit", () => {
  const spy = vi.fn()
  const { rerender } = render(
    <Stylo value={FM} onChange={() => {}} mode="source" onFrontmatter={spy} />,
  )
  spy.mockClear()

  rerender(
    <Stylo value={`${FM}\nmore body`} onChange={() => {}} mode="source" onFrontmatter={spy} />,
  )
  expect(spy).not.toHaveBeenCalled()

  rerender(
    <Stylo
      value={"---\ntitle: B\n---\n\n# Body\n"}
      onChange={() => {}}
      mode="source"
      onFrontmatter={spy}
    />,
  )
  expect(spy).toHaveBeenCalledWith("title: B")
})

test("onFrontmatter fires null when the block is removed", () => {
  const spy = vi.fn()
  const { rerender } = render(
    <Stylo value={FM} onChange={() => {}} mode="source" onFrontmatter={spy} />,
  )
  spy.mockClear()
  rerender(<Stylo value="# Body\n" onChange={() => {}} mode="source" onFrontmatter={spy} />)
  expect(spy).toHaveBeenCalledWith(null)
})

test("splitFrontmatter slices the block, or returns null", () => {
  expect(splitFrontmatter(FM)).toEqual({
    frontmatter: "title: A\ntags: [x]",
    body: "\n# Body\n",
  })
  expect(splitFrontmatter("# no fm")).toBeNull()
  expect(splitFrontmatter("---\n---\n\nbody")).toEqual({ frontmatter: "", body: "\nbody" })
})
