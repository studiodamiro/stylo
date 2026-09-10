import type { PhrasingContent, Root } from "mdast"
import { expect, test } from "vitest"
import { EMBED_PATTERN, isLoneEmbed } from "../src/embed"
import { remarkEmbed } from "../src/render/remark-embed"

function runOn(children: PhrasingContent[]) {
  const tree: Root = { type: "root", children: [{ type: "paragraph", children }] }
  remarkEmbed()(tree)
  const node = tree.children[0]
  if (node?.type !== "paragraph") throw new Error("expected a paragraph")
  return node
}

test("EMBED_PATTERN captures the whole reference, size hint and all", () => {
  EMBED_PATTERN.lastIndex = 0
  expect(EMBED_PATTERN.exec("![[image.png|300]]")?.[1]).toBe("image.png|300")
  EMBED_PATTERN.lastIndex = 0
  expect(EMBED_PATTERN.exec("![[Note#Heading]]")?.[1]).toBe("Note#Heading")
})

test("isLoneEmbed is true only when the trimmed text is exactly one embed", () => {
  expect(isLoneEmbed("![[Note]]")).toBe(true)
  expect(isLoneEmbed("  ![[Note]]  ")).toBe(true)
  expect(isLoneEmbed("see ![[Note]]")).toBe(false)
  expect(isLoneEmbed("![[Note]] and text")).toBe(false)
  expect(isLoneEmbed("[[Note]]")).toBe(false)
})

test("a lone-embed paragraph becomes an empty stylo-embed div carrying the ref", () => {
  const node = runOn([{ type: "text", value: "![[Weekly note#Tasks]]" }])
  expect(node.children).toHaveLength(0)
  expect(node.data?.hName).toBe("div")
  expect(node.data?.hProperties?.["data-stylo-embed"]).toBe("Weekly note#Tasks")
  expect(node.data?.hProperties?.className).toEqual(["stylo-embed"])
})

test("an embed mixed into other text is left untouched", () => {
  const node = runOn([{ type: "text", value: "see ![[Note]] here" }])
  expect(node.data?.hName).toBeUndefined()
  expect(node.children).toHaveLength(1)
})

test("a paragraph with a non-text sibling is left untouched", () => {
  const node = runOn([
    { type: "emphasis", children: [{ type: "text", value: "x" }] },
    { type: "text", value: " ![[Note]]" },
  ])
  expect(node.data?.hName).toBeUndefined()
})

test("a plain wikilink paragraph is not treated as an embed", () => {
  const node = runOn([{ type: "text", value: "[[Note]]" }])
  expect(node.data?.hName).toBeUndefined()
})
