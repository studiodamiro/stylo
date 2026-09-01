import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { useCodeMirror, type UseCodeMirrorOptions } from "../src/editor/useCodeMirror"

afterEach(cleanup)

function Harness(props: UseCodeMirrorOptions) {
  const ref = useCodeMirror(props)
  return <div data-testid="host" ref={ref} />
}

function viewIn(container: HTMLElement): EditorView {
  const dom = container.querySelector<HTMLElement>(".cm-editor")
  const view = dom && EditorView.findFromDOM(dom)
  if (!view) throw new Error("EditorView not mounted")
  return view
}

test("a local edit calls onChange with the full document", () => {
  const onChange = vi.fn()
  const { container } = render(<Harness value="hello" onChange={onChange} />)
  const view = viewIn(container)

  view.dispatch({ changes: { from: view.state.doc.length, insert: " world" } })

  expect(onChange).toHaveBeenCalledWith("hello world")
})

test("an external value change updates the doc without calling onChange", () => {
  const onChange = vi.fn()
  const { container, rerender } = render(<Harness value="one" onChange={onChange} />)

  rerender(<Harness value="two" onChange={onChange} />)

  expect(viewIn(container).state.doc.toString()).toBe("two")
  expect(onChange).not.toHaveBeenCalled()
})

test("readOnly makes the surface non-editable", () => {
  const onChange = vi.fn()
  const { container } = render(<Harness value="x" onChange={onChange} readOnly />)
  const view = viewIn(container)

  expect(view.state.readOnly).toBe(true)
  expect(view.contentDOM.getAttribute("contenteditable")).toBe("false")
})
