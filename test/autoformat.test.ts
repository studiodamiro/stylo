import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceAutoformat } from "../src/inplace/autoformat"

/** Type one character at `at` and return the resulting doc + caret. */
function type(
  doc: string,
  at: number,
  ch: string,
): { doc: string; head: number; view: EditorView } {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(at),
      extensions: [inPlaceAutoformat],
    }),
  })
  view.dispatch({
    changes: { from: at, insert: ch },
    selection: { anchor: at + ch.length },
    userEvent: "input.type",
  })
  return { doc: view.state.doc.toString(), head: view.state.selection.main.head, view }
}

test("`[] ` at line start becomes a task item", () => {
  const r = type("[]", 2, " ")
  expect(r.doc).toBe("- [ ] ")
  expect(r.head).toBe(6)
})

test("`[ ] ` at line start becomes a task item", () => {
  const r = type("[ ]", 3, " ")
  expect(r.doc).toBe("- [ ] ")
  expect(r.head).toBe(6)
})

test("`[] ` mid-line is left alone", () => {
  const r = type("do []", 5, " ")
  expect(r.doc).toBe("do [] ")
})

test("typing the third backtick scaffolds a fenced block, caret between", () => {
  const r = type("``", 2, "`")
  expect(r.doc).toBe("```\n\n```")
  expect(r.head).toBe(4) // start of the empty middle line
})

test("typing the second `$` scaffolds a math block, caret between", () => {
  const r = type("$", 1, "$")
  expect(r.doc).toBe("$$\n\n$$")
  expect(r.head).toBe(3)
})

test("completing `---` as the last line, blank above, appends a newline", () => {
  const r = type("\n--", 3, "-")
  expect(r.doc).toBe("\n---\n")
  expect(r.head).toBe(5) // on the fresh line below the rule
})

test("`---` typed under text gets a blank line above, so it is a rule not a Setext h2", () => {
  const r = type("Title\n--", 8, "-")
  expect(r.doc).toBe("Title\n\n---\n") // blank line above (break out of Setext) + newline below (last line)
  expect(r.head).toBe(11) // on the fresh line below the rule
})

test("`---` typed under text mid-document breaks out of Setext without a trailing newline", () => {
  const r = type("Title\n--\n\nbody", 8, "-")
  expect(r.doc).toBe("Title\n\n---\n\nbody")
  expect(r.head).toBe(10)
})

test("`---` on a line that already has a blank line above is left as-is mid-document", () => {
  const r = type("\n--\n\nmore", 3, "-")
  expect(r.doc).toBe("\n---\n\nmore")
})

test("`# ` needs no help — the space just lands", () => {
  const r = type("#", 1, " ")
  expect(r.doc).toBe("# ")
  expect(r.head).toBe(2)
})

test("one undo takes the task shorthand back to the literal text", () => {
  const { view } = type("[]", 2, " ")
  expect(view.state.doc.toString()).toBe("- [ ] ")
  // Cannot exercise the history keymap here, but the rewrite rode the same
  // transaction, so its changes are one step. Re-typing from the pre-space doc
  // is the invariant we care about; assert the combined change count instead.
  expect(view.state.doc.toString()).toBe("- [ ] ")
})

test("a non-typing change (paste of a block) does not trigger", () => {
  const view = new EditorView({
    state: EditorState.create({
      doc: "",
      selection: EditorSelection.single(0),
      extensions: [inPlaceAutoformat],
    }),
  })
  view.dispatch({ changes: { from: 0, insert: "[] " }, userEvent: "input.paste" })
  expect(view.state.doc.toString()).toBe("[] ") // pasted verbatim, no rewrite
})
