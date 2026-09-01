import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { Stylo } from "../src/Stylo"

afterEach(cleanup)

test("renders a CodeMirror source surface by default", () => {
  const { container } = render(<Stylo value="# hi" onChange={() => {}} />)
  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector(".stylo")).not.toBeNull()
})

test("an unimplemented mode falls back to source with one warning", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const { container } = render(<Stylo value="x" onChange={() => {}} mode="in-place" />)

  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector('[data-stylo-mode="source"]')).not.toBeNull()
  expect(warn).toHaveBeenCalledOnce()

  warn.mockRestore()
})

test("forwards a custom className onto the root", () => {
  const { container } = render(<Stylo value="x" onChange={() => {}} className="mine" />)
  expect(container.querySelector(".stylo.mine")).not.toBeNull()
})
