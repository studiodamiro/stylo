import { expect, test } from "vitest"
import { CompletionContext } from "@codemirror/autocomplete"
import { EditorState, type TransactionSpec } from "@codemirror/state"
import { wikilinkCompletionSource } from "../src/editor/wikilink-complete"
import type { WikiLinkCompletion } from "../src/types"

const src =
  (list: WikiLinkCompletion[]) =>
  (query: string): WikiLinkCompletion[] =>
    list.filter((c) => c.target.toLowerCase().includes(query.trim().toLowerCase()))

/** Run the source at the caret marked by `|` in `text`. */
async function complete(text: string, list: WikiLinkCompletion[], explicit = false) {
  const pos = text.indexOf("|")
  const doc = text.slice(0, pos) + text.slice(pos + 1)
  const state = EditorState.create({ doc, selection: { anchor: pos } })
  const ctx = new CompletionContext(state, pos, explicit)
  return { result: await wikilinkCompletionSource(src(list))(ctx), state }
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

const PAGES: WikiLinkCompletion[] = [
  { target: "Getting Started" },
  { target: "Guide/Setup" },
  { target: "api/reference", label: "API Reference" },
]

test("fires inside an unclosed [[ and reports the query span", async () => {
  const { result } = await complete("see [[Gui| now", PAGES)
  expect(result).not.toBeNull()
  expect(result!.from).toBe(6) // just after `[[`
  expect(result!.to).toBe(9)
  expect(result!.filter).toBe(false)
  expect(result!.options.map((o) => o.label)).toEqual(["Guide/Setup"])
})

test("does not fire outside a wikilink, or with a closed pair before the caret", async () => {
  expect((await complete("plain text| here", PAGES)).result).toBeNull()
  expect((await complete("a [[Page]] then| more", PAGES)).result).toBeNull()
  expect((await complete("link [Page](url)| x", PAGES)).result).toBeNull()
})

test("bare `[[` waits for a keystroke unless the trigger is explicit", async () => {
  expect((await complete("x [[| y", PAGES)).result).toBeNull()
  expect((await complete("x [[| y", PAGES, true)).result).not.toBeNull()
})

test("returns null when the source has no matches", async () => {
  expect((await complete("[[zzz|", PAGES)).result).toBeNull()
})

test("accepting inserts [[target]] and closes the brackets", async () => {
  const { result, state } = await complete("see [[Gui|", PAGES)
  expect(applied(state, result!.options[0]!, result!.from, result!.to)).toBe("see [[Guide/Setup]]")
})

test("accepting reuses an existing closing ]]", async () => {
  const { result, state } = await complete("x [[Gui|]] y", PAGES)
  expect(applied(state, result!.options[0]!, result!.from, result!.to)).toBe("x [[Guide/Setup]] y")
})

test("a candidate whose label differs writes [[target|label]]", async () => {
  const { result, state } = await complete("[[refere|", PAGES)
  const opt = result!.options.find((o) => o.label === "API Reference")!
  expect(applied(state, opt, result!.from, result!.to)).toBe("[[api/reference|API Reference]]")
})
