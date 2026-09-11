import { createRef } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import type { StyloHandle, StyloMode } from "../src/types"

afterEach(cleanup)

function Harness({
  initial,
  mode = "source",
  handleRef,
}: {
  initial: string
  mode?: StyloMode
  handleRef?: React.Ref<StyloHandle>
}) {
  return (
    <Stylo
      ref={handleRef}
      value={initial}
      onChange={() => {}}
      mode={mode}
      canvasHeader={({ view }) => (
        <div data-testid="header" data-has-view={view instanceof EditorView}>
          frontmatter card
        </div>
      )}
    />
  )
}

function pressModF(el: Element) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true, cancelable: true }),
  )
}

test("canvasHeader renders inside the source surface, as a CM6 panel", () => {
  const { container } = render(<Harness initial="body text" />)
  expect(
    container.querySelector(".cm-panel.stylo-canvas-header [data-testid='header']"),
  ).not.toBeNull()
})

test("canvasHeader receives the live EditorView once mounted", () => {
  const { getByTestId } = render(<Harness initial="body text" />)
  expect(getByTestId("header").dataset.hasView).toBe("true")
})

test("the search panel docks above canvasHeader, not below it", () => {
  const { container } = render(<Harness initial="body text" />)
  pressModF(container.querySelector(".cm-content")!)

  const panels = container.querySelector(".cm-panels-top")!
  const order = [...panels.children].map((el) => el.className)
  const searchIndex = order.findIndex((c) => c.includes("stylo-search-panel"))
  const headerIndex = order.findIndex((c) => c.includes("stylo-canvas-header"))
  expect(searchIndex).toBeGreaterThanOrEqual(0)
  expect(headerIndex).toBeGreaterThan(searchIndex)
})

test("canvasHeader is available on the in-place canvas too", async () => {
  const { container } = render(<Harness initial="body text" mode="in-place" />)
  await vi.waitFor(() => {
    if (!container.querySelector(".cm-content")) throw new Error("not mounted")
  })
  expect(container.querySelector(".stylo-canvas-header")).not.toBeNull()
})

test("canvasHeader reaches the source pane in split mode", async () => {
  const { container } = render(<Harness initial="# heading" mode="split" />)
  await screen.findByRole("heading", { name: "heading" })
  expect(container.querySelector(".stylo-canvas-header")).not.toBeNull()
})

test("preview mode has no editor, so canvasHeader never renders", () => {
  const { container } = render(<Harness initial="body text" mode="preview" />)
  expect(container.querySelector(".cm-content")).toBeNull()
  expect(container.querySelector(".stylo-canvas-header")).toBeNull()
})

test("omitting canvasHeader adds no extra panel at all", () => {
  const ref = createRef<StyloHandle>()
  const { container } = render(
    <Stylo ref={ref} value="body text" onChange={() => {}} mode="source" />,
  )
  expect(container.querySelector(".stylo-canvas-header")).toBeNull()
})
