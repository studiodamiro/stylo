import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { attachLongPress } from "../src/inplace/long-press"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function down(el: HTMLElement, x: number, y: number, pointerType = "touch") {
  el.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y, pointerType }),
  )
}
function move(el: HTMLElement, x: number, y: number) {
  el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y }))
}
function up(el: HTMLElement) {
  el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
}

test("fires after the hold with the contact point", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress })

  down(el, 30, 40)
  vi.advanceTimersByTime(499)
  expect(onLongPress).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(onLongPress).toHaveBeenCalledWith(30, 40, el)
})

test("a mouse pointer never triggers it", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress })

  down(el, 10, 10, "mouse")
  vi.advanceTimersByTime(1000)
  expect(onLongPress).not.toHaveBeenCalled()
})

test("lifting before the delay cancels it", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress })

  down(el, 10, 10)
  vi.advanceTimersByTime(200)
  up(el)
  vi.advanceTimersByTime(1000)
  expect(onLongPress).not.toHaveBeenCalled()
})

test("moving past the slop cancels it", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress, slop: 10 })

  down(el, 10, 10)
  move(el, 10, 25) // 15px on the y axis — past 10
  vi.advanceTimersByTime(1000)
  expect(onLongPress).not.toHaveBeenCalled()
})

test("a small jitter within the slop still fires", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress, slop: 10 })

  down(el, 10, 10)
  move(el, 14, 16) // within 10 on both axes
  vi.advanceTimersByTime(500)
  expect(onLongPress).toHaveBeenCalledTimes(1)
})

test("dispose removes the listeners", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  const handle = attachLongPress(el, { onLongPress })

  handle.dispose()
  down(el, 10, 10)
  vi.advanceTimersByTime(1000)
  expect(onLongPress).not.toHaveBeenCalled()
})

test("cancel aborts a press in progress but leaves the listeners attached", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  const handle = attachLongPress(el, { onLongPress })

  down(el, 10, 10)
  vi.advanceTimersByTime(200)
  handle.cancel()
  vi.advanceTimersByTime(1000)
  expect(onLongPress).not.toHaveBeenCalled()

  // a fresh press still works
  down(el, 10, 10)
  vi.advanceTimersByTime(500)
  expect(onLongPress).toHaveBeenCalledTimes(1)
})

test("a custom delay is honoured", () => {
  const el = document.createElement("div")
  const onLongPress = vi.fn()
  attachLongPress(el, { onLongPress, delay: 250 })

  down(el, 5, 5)
  vi.advanceTimersByTime(250)
  expect(onLongPress).toHaveBeenCalledTimes(1)
})
