import { afterEach, expect, test } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { Stylo } from "../src/Stylo"

afterEach(cleanup)

test("renders a CodeMirror source surface by default", () => {
  const { container } = render(<Stylo value="# hi" onChange={() => {}} />)
  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector(".stylo")).not.toBeNull()
})

test("an out-of-range mode value falls back to source", () => {
  const { container } = render(<Stylo value="x" onChange={() => {}} mode={"bogus" as never} />)

  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector('[data-stylo-mode="source"]')).not.toBeNull()
})

test("forwards a custom className onto the root", () => {
  const { container } = render(<Stylo value="x" onChange={() => {}} className="mine" />)
  expect(container.querySelector(".stylo.mine")).not.toBeNull()
})
