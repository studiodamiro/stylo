import { createRef, useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { findNext, replaceAll, SearchQuery, setSearchQuery } from "@codemirror/search"
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
  const [doc, setDoc] = useState(initial)
  return <Stylo ref={handleRef} value={doc} onChange={setDoc} mode={mode} />
}

function pressModF(el: Element) {
  const ev = new KeyboardEvent("keydown", {
    key: "f",
    ctrlKey: true, // jsdom is non-Mac, so CodeMirror maps "Mod-" to Ctrl
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(ev)
  return ev
}

test("Mod-f opens the find panel and suppresses the browser default", () => {
  const { container } = render(<Harness initial="alpha beta alpha" />)
  expect(container.querySelector(".cm-panel.cm-search")).toBeNull()

  const ev = pressModF(container.querySelector(".cm-content")!)

  expect(ev.defaultPrevented).toBe(true)
  expect(container.querySelector(".cm-panel.cm-search")).not.toBeNull()
})

test("the find panel is available on the in-place canvas too", async () => {
  const { container } = render(<Harness initial="alpha beta alpha" mode="in-place" />)
  // The in-place surface is a lazy chunk — wait for the editor to attach.
  await vi.waitFor(() => {
    if (!container.querySelector(".cm-content")) throw new Error("not mounted")
  })

  pressModF(container.querySelector(".cm-content")!)

  expect(container.querySelector(".cm-panel.cm-search")).not.toBeNull()
})

test("findNext walks the matches", () => {
  const ref = createRef<StyloHandle>()
  render(<Harness initial={"alpha beta alpha"} handleRef={ref} />)
  const view = ref.current!.getView()!

  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "alpha" })) })

  findNext(view)
  expect(view.state.selection.main.from).toBe(0)

  findNext(view)
  expect(view.state.selection.main.from).toBe(11)
})

test("replaceAll rewrites every match", () => {
  const ref = createRef<StyloHandle>()
  render(<Harness initial={"alpha beta alpha"} handleRef={ref} />)
  const view = ref.current!.getView()!

  view.dispatch({
    effects: setSearchQuery.of(new SearchQuery({ search: "alpha", replace: "ALPHA" })),
  })
  replaceAll(view)

  expect(view.state.doc.toString()).toBe("ALPHA beta ALPHA")
})

test("preview mode has no editor, so Mod-f does nothing", () => {
  const { container } = render(<Harness initial="alpha beta alpha" mode="preview" />)

  expect(container.querySelector(".cm-content")).toBeNull()
  expect(container.querySelector(".cm-panel.cm-search")).toBeNull()
})
