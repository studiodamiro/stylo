import { expect, test } from "vitest"
import { markedContentAt, wrapString } from "../src/toolbar/inline-ops"

/** Char span of `markedContentAt`, sliced back to text for readability. */
function content(text: string, pos: number): string | null {
  const run = markedContentAt(text, pos)
  return run ? text.slice(run.from, run.to) : null
}

test("markedContentAt spans a multi-word bold run", () => {
  const t = "x **alpha beta** y"
  expect(content(t, t.indexOf("alpha"))).toBe("alpha beta")
  expect(content(t, t.indexOf("beta") + 2)).toBe("alpha beta")
})

test("markedContentAt handles italic, strike and code", () => {
  expect(content("a *one two* b", 4)).toBe("one two")
  expect(content("a ~~one two~~ b", 5)).toBe("one two")
  expect(content("a `one two` b", 4)).toBe("one two")
})

test("markedContentAt returns the innermost run for a nested stack", () => {
  const t = "x ***alpha beta*** y"
  expect(content(t, t.indexOf("alpha"))).toBe("alpha beta")
})

test("markedContentAt spans a link label and a wikilink target/label", () => {
  expect(content("see [two words](http://x) end", 6)).toBe("two words")
  expect(content("go [[Page Name]] now", 6)).toBe("Page Name")
  expect(content("go [[api/ref|the docs page]] now", 15)).toBe("the docs page")
})

test("markedContentAt is null outside any run", () => {
  expect(content("just plain words", 6)).toBeNull()
  expect(content("x **bold** y", 0)).toBeNull()
})

test("markedContentAt ignores an empty pair", () => {
  expect(content("a **** b", 3)).toBeNull()
})

// A quick guard that wrapString still round-trips through markedContentAt spans.
test("wrapString unbolds the exact span markedContentAt reports", () => {
  const t = "x **alpha beta** y"
  const run = markedContentAt(t, 5)!
  expect(wrapString(t, run.from, run.to, "**").text).toBe("x alpha beta y")
})
