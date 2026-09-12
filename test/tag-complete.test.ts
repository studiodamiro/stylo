import { expect, test, vi } from "vitest"
import { CompletionContext } from "@codemirror/autocomplete"
import { EditorState, type TransactionSpec } from "@codemirror/state"
import { tagCompletionSource } from "../src/editor/tag-complete"
import type { TagCompletion, TagSource } from "../src/types"

const src =
  (list: TagCompletion[]) =>
  (query: string): TagCompletion[] =>
    list.filter((c) => c.tag.toLowerCase().includes(query.trim().toLowerCase()))

/** Run the source at the caret marked by `|` in `text`. */
async function complete(text: string, list: TagCompletion[], explicit = false) {
  const pos = text.indexOf("|")
  const doc = text.slice(0, pos) + text.slice(pos + 1)
  const state = EditorState.create({ doc, selection: { anchor: pos } })
  const ctx = new CompletionContext(state, pos, explicit)
  return { result: await tagCompletionSource(src(list))(ctx), state }
}

/** Apply an option and return the resulting doc string. */
function applied(
  state: EditorState,
  option: { apply?: unknown },
  from: number,
  to?: number,
): string {
  let spec: TransactionSpec | undefined
  const view = { state, dispatch: (s: TransactionSpec) => (spec = s) }
  ;(option.apply as (v: unknown, c: unknown, f: number, t: number) => void)(
    view,
    option,
    from,
    to ?? from,
  )
  return state.update(spec!).state.doc.toString()
}

const TAGS: TagCompletion[] = [{ tag: "project" }, { tag: "project/urgent" }, { tag: "recipe" }]

test("fires inside an unclosed # and reports the query span", async () => {
  const { result } = await complete("see #proj| now", TAGS)
  expect(result).not.toBeNull()
  expect(result!.from).toBe(5) // just after `#`
  expect(result!.to).toBe(9)
  expect(result!.filter).toBe(false)
  expect(result!.options.map((o) => o.label)).toEqual(["project", "project/urgent"])
})

test("does not fire without a #, or when # is preceded by a non-space character", async () => {
  expect((await complete("plain text| here", TAGS)).result).toBeNull()
  expect((await complete("word#word| x", TAGS)).result).toBeNull()
  expect((await complete("link(page#frag)| x", TAGS)).result).toBeNull()
})

test("does not fire on a heading marker — the space breaks the match", async () => {
  expect((await complete("# proj| ect", TAGS)).result).toBeNull()
})

test("does not fire when the character after # is a digit", async () => {
  expect((await complete("see #123| issue", TAGS)).result).toBeNull()
})

test("bare `#` waits for a keystroke unless the trigger is explicit", async () => {
  expect((await complete("x #| y", TAGS)).result).toBeNull()
  expect((await complete("x #| y", TAGS, true)).result).not.toBeNull()
})

test("returns null when the source has no matches", async () => {
  expect((await complete("#zzz|", TAGS)).result).toBeNull()
})

test("accepting replaces the typed query with the full tag", async () => {
  const { result, state } = await complete("see #proj|", TAGS)
  const opt = result!.options.find((o) => o.label === "project")!
  expect(applied(state, opt, result!.from, result!.to)).toBe("see #project")
})

test("a rejected source shows no completions and reports through onResolveError", async () => {
  const onError = vi.fn()
  const boom = new Error("index offline")
  const source: TagSource = () => Promise.reject(boom)
  const state = EditorState.create({ doc: "see #proj", selection: { anchor: 9 } })
  const ctx = new CompletionContext(state, 9, false)

  const result = await tagCompletionSource(source, onError)(ctx)

  expect(result).toBeNull()
  expect(onError).toHaveBeenCalledWith(boom, { source: "tagSource", input: "proj" })
})
