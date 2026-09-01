import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { Stylo } from "../src/Stylo"

afterEach(cleanup)

test("defaults to the in-place canvas", async () => {
  const { container } = render(<Stylo value="# hi" onChange={() => {}} />)
  expect(container.querySelector('[data-stylo-mode="in-place"]')).not.toBeNull()

  // in-place is a lazy chunk — the editor attaches asynchronously
  await vi.waitFor(() => {
    if (!container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  expect(container.querySelector(".stylo")).not.toBeNull()
})

test('mode="source" renders the plain surface synchronously', () => {
  const { container } = render(<Stylo value="# hi" onChange={() => {}} mode="source" />)
  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector('[data-stylo-mode="source"]')).not.toBeNull()
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
