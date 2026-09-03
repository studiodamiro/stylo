import { expect, test } from "vitest"
import { CALLOUT_HEAD_LINE, CALLOUT_TOKEN, calloutBucket } from "../src/callout"

test("calloutBucket collapses Obsidian type names to five buckets", () => {
  expect(calloutBucket("note")).toBe("note")
  expect(calloutBucket("INFO")).toBe("note")
  expect(calloutBucket("tip")).toBe("tip")
  expect(calloutBucket("success")).toBe("tip")
  expect(calloutBucket("warning")).toBe("warn")
  expect(calloutBucket("danger")).toBe("danger")
  expect(calloutBucket("bug")).toBe("danger")
  expect(calloutBucket("example")).toBe("example")
  expect(calloutBucket("totally-made-up")).toBe("note") // unknown → note
})

test("CALLOUT_TOKEN matches the bare token with an optional fold marker", () => {
  expect(CALLOUT_TOKEN.exec("[!note] Title")?.[1]).toBe("note")
  expect(CALLOUT_TOKEN.exec("[!warning]- folded")?.[1]).toBe("warning")
  expect(CALLOUT_TOKEN.exec("not a callout")).toBeNull()
})

test("CALLOUT_HEAD_LINE splits the prefix from the token on a canvas line", () => {
  const m = CALLOUT_HEAD_LINE.exec("> [!tip] Handy")!
  expect(m[1]).toBe("> ") // prefix
  expect(m[2]).toBe("[!tip] ") // token to hide
  expect(m[3]).toBe("tip")
})
