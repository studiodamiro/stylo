import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import {
  classifyContext,
  menuRows,
  type MenuContext,
} from "../src/inplace/context-menu-actions"
import type { MenuRow, MenuSubmenu } from "../src/inplace/context-menu"

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
