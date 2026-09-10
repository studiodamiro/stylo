import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Stylo } from "../src/Stylo"

afterEach(cleanup)

test("split mode renders both the source surface and the preview, with no warning", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const { container } = render(
    <Stylo value={"# heading\n\nbody text"} onChange={() => {}} mode="split" />,
  )

  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector('[data-stylo-mode="split"]')).not.toBeNull()

  // Preview is lazy — wait for the chunk to resolve and render.
  expect(await screen.findByRole("heading", { name: "heading" })).toBeInTheDocument()
  expect(warn).not.toHaveBeenCalled()

  warn.mockRestore()
})

test('split forwards frontmatter="code" to its preview pane', async () => {
  const { container } = render(
    <Stylo
      value={"---\ntitle: Shown\n---\n\n# body"}
      onChange={() => {}}
      mode="split"
      frontmatter="code"
    />,
  )

  // The source pane also shows the raw block; assert the preview pane's styled
  // <div class="stylo-frontmatter"> appears, which it only does when the prop
  // reaches LazyPreview.
  await screen.findByRole("heading", { name: "body" })
  const block = container.querySelector(".stylo-frontmatter")
  expect(block?.textContent).toBe("title: Shown")
})
