import { expect, test } from "vitest"
import { mathAtIn } from "../src/inplace/math"

test("mathAtIn finds inline $…$ covering the position", () => {
  const text = "before $x^2$ after"
  const at = mathAtIn(text, text.indexOf("2"))
  expect(at).toEqual({ from: 7, to: 12, src: "x^2", block: false })
})

test("mathAtIn finds a one-line $$…$$ block covering the position", () => {
  const text = "before $$x^2 + 1$$ after"
  const at = mathAtIn(text, text.indexOf("+"))
  expect(at).toEqual({ from: 7, to: 18, src: "x^2 + 1", block: true })
})

test("mathAtIn returns null off any math span", () => {
  expect(mathAtIn("before $x^2$ after", 0)).toBeNull()
  expect(mathAtIn("plain text, no math", 5)).toBeNull()
})

test("mathAtIn ignores a lone $$ fence (a multi-line block's opening line)", () => {
  expect(mathAtIn("$$", 0)).toBeNull()
})

test("mathAtIn does not read $100 and $200 as math", () => {
  expect(mathAtIn("costs $100 and $200", 8)).toBeNull()
})

test("mathAtIn rejects a space just inside the fences, same as the rendering scan", () => {
  expect(mathAtIn("$ x^2 $", 3)).toBeNull()
})
