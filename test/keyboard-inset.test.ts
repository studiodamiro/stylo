import { afterEach, expect, test, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useKeyboardInset } from "../src/toolbar/keyboard-inset"

/** A minimal `visualViewport` stand-in — jsdom ships none at all. */
class FakeVisualViewport extends EventTarget {
  height: number
  offsetTop: number
  constructor(height: number, offsetTop = 0) {
    super()
    this.height = height
    this.offsetTop = offsetTop
  }
  resize(height: number, offsetTop = this.offsetTop) {
    this.height = height
    this.offsetTop = offsetTop
    this.dispatchEvent(new Event("resize"))
  }
}

const originalInnerHeight = window.innerHeight
const originalVV = window.visualViewport

afterEach(() => {
  Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true })
  Object.defineProperty(window, "visualViewport", { value: originalVV, configurable: true })
})

test("returns 0 with no visualViewport (jsdom's default)", () => {
  const { result } = renderHook(() => useKeyboardInset(true))
  expect(result.current).toBe(0)
})

test("returns 0 when disabled, even with a visualViewport present", () => {
  const vv = new FakeVisualViewport(800)
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true })
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true })

  const { result } = renderHook(() => useKeyboardInset(false))
  expect(result.current).toBe(0)
})

test("computes the inset from window height minus the visual viewport", () => {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true })
  const vv = new FakeVisualViewport(800)
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true })

  const { result } = renderHook(() => useKeyboardInset(true))
  expect(result.current).toBe(0) // no keyboard yet

  act(() => vv.resize(500)) // a keyboard opens, eating 300px
  expect(result.current).toBe(300)

  act(() => vv.resize(800)) // keyboard closes
  expect(result.current).toBe(0)
})

test("stops tracking once disabled", () => {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true })
  const vv = new FakeVisualViewport(800)
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true })

  const { result, rerender } = renderHook(({ enabled }) => useKeyboardInset(enabled), {
    initialProps: { enabled: true },
  })
  act(() => vv.resize(500))
  expect(result.current).toBe(300)

  rerender({ enabled: false })
  expect(result.current).toBe(0)

  act(() => vv.resize(200)) // no listener left; inset stays at 0
  expect(result.current).toBe(0)
})
