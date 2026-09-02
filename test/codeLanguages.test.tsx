import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { languages } from "@codemirror/language-data"
import { syntaxTree } from "@codemirror/language"
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

const DOC = ["```javascript", "const answer = 41 + 1", "```", ""].join("\n")

/** Names of the nodes covering the fenced body, from the outside in. */
function nodesOverBody(view: EditorView): string[] {
  const at = view.state.doc.line(2).from + 6 // inside `answer`
  const names: string[] = []
  for (let node = syntaxTree(view.state).resolveInner(at, 1); node; node = node.parent!) {
    names.push(node.name)
    if (!node.parent) break
  }
  return names
}

test("without codeLanguages a fenced body stays plain CodeText", () => {
  const { container } = render(<Harness value={DOC} onChange={() => {}} />)
  expect(nodesOverBody(viewIn(container))).toContain("CodeText")
})

test("codeLanguages nests the matching grammar inside a fenced block", async () => {
  const { container } = render(
    <Harness value={DOC} onChange={() => {}} codeLanguages={languages} />,
  )
  const view = viewIn(container)

  // The grammar for a language-data entry loads via dynamic import; the Markdown
  // parser re-parses the block once it resolves.
  await vi.waitFor(() => {
    const names = nodesOverBody(view)
    if (names.includes("CodeText")) throw new Error("grammar not loaded yet")
    expect(names).toContain("VariableDefinition")
  })
})

test("the highlight style paints token spans in a fenced block", async () => {
  const { container } = render(
    <Harness value={DOC} onChange={() => {}} codeLanguages={languages} />,
  )
  const view = viewIn(container)

  await vi.waitFor(() => {
    const codeLine = view.dom.querySelectorAll<HTMLElement>(".cm-line")[1]
    const keyword = [...(codeLine?.querySelectorAll("span") ?? [])].find(
      (s) => s.textContent === "const",
    )
    if (!keyword) throw new Error("token spans not rendered yet")
    // A HighlightStyle rule wraps the token and gives it a generated class.
    expect(keyword.className).not.toBe("")
  })
})
