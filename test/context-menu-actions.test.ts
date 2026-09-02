import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import {
  classifyContext,
  menuRows,
  type MenuContext,
} from "../src/inplace/context-menu-actions"
import type { MenuField, MenuRow, MenuSubmenu } from "../src/inplace/context-menu"
import { linkPartsIn } from "../src/toolbar/inline-ops"

function mkView(doc: string, anchor = doc.length, head = anchor): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdownLanguage],
      selection: EditorSelection.single(anchor, head),
    }),
  })
}

const ctx = (doc: string, anchor?: number, head?: number): MenuContext =>
  classifyContext(mkView(doc, anchor, head).state)

const labels = (rows: MenuRow[]): string[] =>
  rows.filter((r): r is Exclude<MenuRow, "separator"> => r !== "separator").map((r) => r.label)

const isSubmenu = (r: MenuRow): r is MenuSubmenu => typeof r !== "string" && "rows" in r
const isField = (r: MenuRow): r is MenuField => typeof r !== "string" && "field" in r

test("a non-empty selection classifies as 'selection'", () => {
  expect(ctx("hello world", 0, 5)).toBe("selection")
})

test("a bare caret in ordinary text classifies as 'plain'", () => {
  expect(ctx("just a paragraph")).toBe("plain")
})

test("a caret on a heading line classifies as 'block'", () => {
  expect(ctx("# Title")).toBe("block")
})

test("a caret inside a fenced code block classifies as 'block'", () => {
  const doc = "```\ncode here\n```"
  expect(ctx(doc, doc.indexOf("code"))).toBe("block")
})

test("a caret on a blockquote or list line classifies as 'block'", () => {
  expect(ctx("> quoted")).toBe("block")
  expect(ctx("- item")).toBe("block")
  expect(ctx("1. item")).toBe("block")
})

test("selection rows lead with inline actions and carry clipboard entries", () => {
  const rows = menuRows(mkView("hello world", 0, 5))
  const l = labels(rows)
  expect(l.slice(0, 3)).toEqual(["Bold", "Italic", "Strikethrough"])
  expect(l).toEqual(expect.arrayContaining(["Cut", "Copy", "Paste"]))
  expect(rows.some(isSubmenu)).toBe(false)
})

test("plain-context rows are just Insert + clipboard", () => {
  const rows = menuRows(mkView("plain text"))
  const submenu = rows.find(isSubmenu) as MenuSubmenu | undefined
  expect(submenu?.label).toBe("Insert")
  expect(labels(submenu!.rows)).toEqual(
    expect.arrayContaining(["Table", "Divider", "Code block"]),
  )
  expect(labels(rows)).toEqual(expect.arrayContaining(["Insert", "Cut", "Copy", "Paste"]))
})

test("block-context rows include block actions, an Insert submenu, and clipboard", () => {
  const rows = menuRows(mkView("# Heading"))
  const l = labels(rows)
  expect(l).toEqual(expect.arrayContaining(["Blockquote", "Insert", "Copy"]))
  expect(rows.some(isSubmenu)).toBe(true)
})

test("linkPartsIn breaks out the URL and its span", () => {
  const text = "see [the docs](https://example.com) now"
  const parts = linkPartsIn(text, text.indexOf("docs"))
  expect(parts).not.toBeNull()
  expect(parts!.label).toBe("the docs")
  expect(parts!.url).toBe("https://example.com")
  expect(text.slice(parts!.urlFrom, parts!.urlTo)).toBe("https://example.com")
})

test("a selection gets a 'Link' field row that wraps it on submit", () => {
  const view = mkView("make this a link", 5, 9) // "this"
  const link = menuRows(view).find(
    (r): r is MenuField => isField(r) && r.label === "Link",
  )
  expect(link).toBeDefined()
  expect(link!.value).toBe("")
  link!.onSubmit("https://x.test")
  expect(view.state.doc.toString()).toBe("make [this](https://x.test) a link")
})

test("a URL with spaces is angle-bracketed so it stays a valid link", () => {
  const view = mkView("wrap word here", 5, 9) // "word"
  const link = menuRows(view).find(
    (r): r is MenuField => isField(r) && r.label === "Link",
  )!
  link.onSubmit("https://ex.test/a b c")
  expect(view.state.doc.toString()).toBe("wrap [word](<https://ex.test/a b c>) here")
})

test("editing a link's URL to one with spaces re-brackets it", () => {
  const doc = "see [x](https://a.test) end"
  const view = mkView(doc, doc.indexOf("x") + 1)
  const link = menuRows(view).find(
    (r): r is MenuField => isField(r) && r.label === "Link",
  )!
  link.onSubmit("https://a.test/with space")
  expect(view.state.doc.toString()).toBe("see [x](<https://a.test/with space>) end")
})

test("the caret in a link gets a prefilled 'Link' field with Remove link", () => {
  const doc = "go to [home](https://a.test) please"
  const view = mkView(doc, doc.indexOf("home") + 1)
  const link = menuRows(view).find(
    (r): r is MenuField => isField(r) && r.label === "Link",
  )
  expect(link).toBeDefined()
  expect(link!.value).toBe("https://a.test")
  expect(link!.actions?.some((a) => a.label === "Remove link")).toBe(true)

  link!.onSubmit("https://b.test")
  expect(view.state.doc.toString()).toBe("go to [home](https://b.test) please")

  link!.actions!.find((a) => a.label === "Remove link")!.onSelect()
  expect(view.state.doc.toString()).toBe("go to home please")
})

test("disabled commands are dropped from the block group but kept for a selection", () => {
  // Inside frontmatter, inline wrap commands report disabled.
  const fm = "---\ntitle: x\n---\n"
  const inFm = fm.indexOf("title")
  const blockRows = menuRows(mkView(fm, inFm))
  // no inline wrap leaked into the block menu
  expect(labels(blockRows)).not.toEqual(expect.arrayContaining(["Bold"]))

  // With a selection in that same block, the inline group is shown regardless,
  // so the user sees why it will not apply.
  const selRows = menuRows(mkView(fm, inFm, inFm + 5))
  expect(labels(selRows)).toEqual(expect.arrayContaining(["Bold", "Italic"]))
})
