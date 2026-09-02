import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { markdownLanguage } from "@codemirror/lang-markdown"
import { Stylo } from "../src/Stylo"
import { BUILTIN_BY_ID } from "../src/toolbar/commands"
import { DEFAULT_TOOLBAR_ITEMS, resolveToolbarItems } from "../src/toolbar/config"

afterEach(cleanup)

/** A bare view with the Markdown grammar and an optional selection. */
function mkView(doc: string, anchor = doc.length, head = anchor): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdownLanguage],
      selection: EditorSelection.single(anchor, head),
    }),
  })
}

test("bold wraps the selection and toggles back off", () => {
  const view = mkView("hello world", 0, 5)
  BUILTIN_BY_ID.bold!.run(view)
  expect(view.state.doc.toString()).toBe("**hello** world")
  BUILTIN_BY_ID.bold!.run(view)
  expect(view.state.doc.toString()).toBe("hello world")
})

test("bold on a bare caret drops an empty pair with the caret between", () => {
  const view = mkView("", 0)
  BUILTIN_BY_ID.bold!.run(view)
  expect(view.state.doc.toString()).toBe("****")
  expect(view.state.selection.main.head).toBe(2)
})

test("wrapActive reports the pressed state for bold", () => {
  const view = mkView("a **bold** word", 5)
  expect(BUILTIN_BY_ID.bold!.isActive!(view.state)).toBe(true)
  view.dispatch({ selection: EditorSelection.single(0) })
  expect(BUILTIN_BY_ID.bold!.isActive!(view.state)).toBe(false)
})

test("h2 sets a heading, swaps from another level, then clears", () => {
  const view = mkView("Title", 0)
  BUILTIN_BY_ID.h2!.run(view)
  expect(view.state.doc.toString()).toBe("## Title")
  BUILTIN_BY_ID.h1!.run(view)
  expect(view.state.doc.toString()).toBe("# Title")
  BUILTIN_BY_ID.h1!.run(view)
  expect(view.state.doc.toString()).toBe("Title")
})

test("task prefixes a checkbox and isActive follows it", () => {
  const view = mkView("buy milk", 0)
  BUILTIN_BY_ID.task!.run(view)
  expect(view.state.doc.toString()).toBe("- [ ] buy milk")
  expect(BUILTIN_BY_ID.task!.isActive!(view.state)).toBe(true)
  BUILTIN_BY_ID.task!.run(view)
  expect(view.state.doc.toString()).toBe("buy milk")
})

test("bulletList toggles across a multi-line selection", () => {
  const view = mkView("one\ntwo\nthree", 0, 13)
  BUILTIN_BY_ID.bulletList!.run(view)
  expect(view.state.doc.toString()).toBe("- one\n- two\n- three")
  BUILTIN_BY_ID.bulletList!.run(view)
  expect(view.state.doc.toString()).toBe("one\ntwo\nthree")
})

test("the list buttons are mutually exclusive — they swap, never stack", () => {
  const view = mkView("first item", 0)
  BUILTIN_BY_ID.bulletList!.run(view)
  expect(view.state.doc.toString()).toBe("- first item")
  BUILTIN_BY_ID.orderedList!.run(view)
  expect(view.state.doc.toString()).toBe("1. first item")
  BUILTIN_BY_ID.task!.run(view)
  expect(view.state.doc.toString()).toBe("- [ ] first item")
  BUILTIN_BY_ID.bulletList!.run(view)
  expect(view.state.doc.toString()).toBe("- first item")
  BUILTIN_BY_ID.bulletList!.run(view)
  expect(view.state.doc.toString()).toBe("first item")
})

test("orderedList over a mix of bullets and plain lines numbers them all", () => {
  const view = mkView("- a\nb\n- c", 0, 9)
  BUILTIN_BY_ID.orderedList!.run(view)
  expect(view.state.doc.toString()).toBe("1. a\n2. b\n3. c")
})

test("orderedList numbers the selected lines 1. 2. 3. and strips them back", () => {
  const view = mkView("alpha\nbeta\ngamma", 0, 16)
  BUILTIN_BY_ID.orderedList!.run(view)
  expect(view.state.doc.toString()).toBe("1. alpha\n2. beta\n3. gamma")
  BUILTIN_BY_ID.orderedList!.run(view)
  expect(view.state.doc.toString()).toBe("alpha\nbeta\ngamma")
})

test("codeBlock fences the selected lines and unwraps them again", () => {
  const view = mkView("a = 1\nb = 2", 0, 11)
  BUILTIN_BY_ID.codeBlock!.run(view)
  expect(view.state.doc.toString()).toBe("```\na = 1\nb = 2\n```")
  view.dispatch({ selection: EditorSelection.single(4) })
  BUILTIN_BY_ID.codeBlock!.run(view)
  expect(view.state.doc.toString()).toBe("a = 1\nb = 2")
})

test("hr inserts a divider after a paragraph line, with a blank line before it", () => {
  const view = mkView("a paragraph", 5)
  BUILTIN_BY_ID.hr!.run(view)
  expect(view.state.doc.toString()).toBe("a paragraph\n\n---\n")
})

test("hr replaces an empty line in place and toggles back off", () => {
  const view = mkView("above\n\nbelow", 6) // the blank middle line
  BUILTIN_BY_ID.hr!.run(view)
  expect(view.state.doc.toString()).toBe("above\n---\nbelow")
  expect(BUILTIN_BY_ID.hr!.isActive!(view.state)).toBe(true)
  BUILTIN_BY_ID.hr!.run(view)
  expect(view.state.doc.toString()).toBe("above\nbelow")
})

test("frontmatter wraps the top of the doc and toggling off keeps the YAML", () => {
  const view = mkView("title: Foo\ntags: [x]\n\n# Heading", 0, 20)
  BUILTIN_BY_ID.frontmatter!.run(view)
  expect(view.state.doc.toString()).toBe("---\ntitle: Foo\ntags: [x]\n---\n\n# Heading")
  expect(BUILTIN_BY_ID.frontmatter!.isActive!(view.state)).toBe(true)

  BUILTIN_BY_ID.frontmatter!.run(view)
  expect(view.state.doc.toString()).toBe("title: Foo\ntags: [x]\n\n# Heading")
  expect(BUILTIN_BY_ID.frontmatter!.isActive!(view.state)).toBe(false)
})

test("frontmatter with no selection wraps just the first line", () => {
  const view = mkView("title: Only\n\nbody", 3)
  BUILTIN_BY_ID.frontmatter!.run(view)
  expect(view.state.doc.toString()).toBe("---\ntitle: Only\n---\n\nbody")
})

test("mathBlock fences the selection in $$ and unwraps from inside", () => {
  const view = mkView("x^2 + y^2", 0, 9)
  BUILTIN_BY_ID.mathBlock!.run(view)
  expect(view.state.doc.toString()).toBe("$$\nx^2 + y^2\n$$")
  view.dispatch({ selection: EditorSelection.single(5) })
  expect(BUILTIN_BY_ID.mathBlock!.isActive!(view.state)).toBe(true)
  BUILTIN_BY_ID.mathBlock!.run(view)
  expect(view.state.doc.toString()).toBe("x^2 + y^2")
})

test("in a $$ block, mathBlock is active and inline math is not — on a fence line too", () => {
  const view = mkView("$$\nx^2 + y^2\n$$")
  for (const anchor of [1, 6, 13]) {
    // opening fence, body, closing fence
    view.dispatch({ selection: EditorSelection.single(anchor) })
    expect(BUILTIN_BY_ID.mathBlock!.isActive!(view.state), `mathBlock @ ${anchor}`).toBe(true)
    expect(BUILTIN_BY_ID.math!.isActive!(view.state), `math @ ${anchor}`).toBe(false)
  }
})

test("inline math is active only inside a real $…$ span", () => {
  const view = mkView("energy $E=mc^2$ here", 10)
  expect(BUILTIN_BY_ID.math!.isActive!(view.state)).toBe(true)
})

test("link wraps the selection and selects the url placeholder", () => {
  const view = mkView("docs", 0, 4)
  BUILTIN_BY_ID.link!.run(view)
  expect(view.state.doc.toString()).toBe("[docs](url)")
  const { from, to } = view.state.selection.main
  expect(view.state.sliceDoc(from, to)).toBe("url")
})

test("link toggles off by unlinking — the label stays, the url goes", () => {
  const view = mkView("see [the docs](https://x.dev) now", 8)
  expect(BUILTIN_BY_ID.link!.isActive!(view.state)).toBe(true)
  BUILTIN_BY_ID.link!.run(view)
  expect(view.state.doc.toString()).toBe("see the docs now")
})

test("resolveToolbarItems: default, explicit true, hidden, custom", () => {
  expect(resolveToolbarItems(undefined)).toEqual(DEFAULT_TOOLBAR_ITEMS)
  expect(resolveToolbarItems(true)).toEqual(DEFAULT_TOOLBAR_ITEMS)
  expect(resolveToolbarItems(false)).toBeNull()
  expect(resolveToolbarItems({ items: ["bold", "|", "italic"] })).toEqual(["bold", "|", "italic"])
})

test("Stylo shows the bar for source mode and a button runs its command", async () => {
  function Host() {
    const [v, setV] = useState("hi")
    return <Stylo value={v} onChange={setV} mode="source" />
  }
  const { container } = render(<Host />)
  const bold = container.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')!
  expect(bold).not.toBeNull()

  const view = EditorView.findFromDOM(container.querySelector(".cm-editor")!)!
  view.dispatch({ selection: EditorSelection.single(0, 2) })
  bold.click()
  await vi.waitFor(() => expect(view.state.doc.toString()).toBe("**hi**"))
})

test("toolbar={false} hides the bar; preview mode never has one", () => {
  const { container: a } = render(
    <Stylo value="x" onChange={() => {}} mode="source" toolbar={false} />,
  )
  expect(a.querySelector('[role="toolbar"]')).toBeNull()

  const { container: b } = render(<Stylo value="x" onChange={() => {}} mode="preview" />)
  expect(b.querySelector('[role="toolbar"]')).toBeNull()
})

test("a custom items list renders exactly those buttons in order", () => {
  const { container } = render(
    <Stylo
      value="x"
      onChange={() => {}}
      mode="source"
      toolbar={{ items: ["bold", "|", "italic", "task"] }}
    />,
  )
  const labels = [...container.querySelectorAll('[role="toolbar"] button')].map((b) =>
    b.getAttribute("aria-label"),
  )
  expect(labels).toEqual(["Bold", "Italic", "Task list"])
})

test("every default item resolves to a built-in command or a separator", () => {
  for (const item of DEFAULT_TOOLBAR_ITEMS) {
    if (item === "|") continue
    expect(BUILTIN_BY_ID[item], item).toBeDefined()
  }
})
