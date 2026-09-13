import { afterEach, expect, test, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { Preview } from "../src/render/Preview"

afterEach(cleanup)

test("without onTaskToggle, checkboxes stay disabled (today's behaviour)", () => {
  const { container } = render(<Preview value={"- [ ] Buy milk\n- [x] Walk the dog"} />)
  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  expect(boxes).toHaveLength(2)
  for (const box of boxes) expect(box.disabled).toBe(true)
})

test("onTaskToggle set: checkboxes render enabled", () => {
  const { container } = render(
    <Preview value={"- [ ] Buy milk\n- [x] Walk the dog"} onTaskToggle={vi.fn()} />,
  )
  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  expect(boxes).toHaveLength(2)
  for (const box of boxes) expect(box.disabled).toBe(false)
})

test("clicking an unchecked box reports offsets that splice to [x]", () => {
  const onTaskToggle = vi.fn()
  const value = "- [ ] Buy milk\n- [x] Walk the dog"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  const box = container.querySelector<HTMLInputElement>("input[type=checkbox]")!
  fireEvent.click(box)

  expect(onTaskToggle).toHaveBeenCalledTimes(1)
  const info = onTaskToggle.mock.calls[0]![0]
  expect(info.checked).toBe(true)
  expect(value.slice(info.start, info.end)).toBe("[ ]")

  const spliced = value.slice(0, info.start) + "[x]" + value.slice(info.end)
  expect(spliced).toBe("- [x] Buy milk\n- [x] Walk the dog")
})

test("clicking a checked box reports checked: false", () => {
  const onTaskToggle = vi.fn()
  const value = "- [ ] Buy milk\n- [x] Walk the dog"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  fireEvent.click(boxes[1]!)

  const info = onTaskToggle.mock.calls[0]![0]
  expect(info.checked).toBe(false)
  expect(value.slice(info.start, info.end)).toBe("[x]")

  const spliced = value.slice(0, info.start) + "[ ]" + value.slice(info.end)
  expect(spliced).toBe("- [ ] Buy milk\n- [ ] Walk the dog")
})

test("second item in a longer list still maps to its own marker, not the first", () => {
  const onTaskToggle = vi.fn()
  const value = "- [ ] one\n- [ ] two\n- [ ] three"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  fireEvent.click(boxes[2]!)

  const info = onTaskToggle.mock.calls[0]![0]
  const spliced = value.slice(0, info.start) + "[x]" + value.slice(info.end)
  expect(spliced).toBe("- [ ] one\n- [ ] two\n- [x] three")
})

test("a checkbox marker followed by bracket-like text in the same item isn't confused", () => {
  const onTaskToggle = vi.fn()
  const value = "- [ ] buy [milk] at the store"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  fireEvent.click(container.querySelector("input[type=checkbox]")!)

  const info = onTaskToggle.mock.calls[0]![0]
  expect(value.slice(info.start, info.end)).toBe("[ ]")
  const spliced = value.slice(0, info.start) + "[x]" + value.slice(info.end)
  expect(spliced).toBe("- [x] buy [milk] at the store")
})

test("an ordered task list item maps to its own marker", () => {
  const onTaskToggle = vi.fn()
  const value = "1. [ ] first\n2. [ ] second"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  fireEvent.click(boxes[1]!)

  const info = onTaskToggle.mock.calls[0]![0]
  const spliced = value.slice(0, info.start) + "[x]" + value.slice(info.end)
  expect(spliced).toBe("1. [ ] first\n2. [x] second")
})

test("a loose task list (blank line between items) still enables and maps correctly", () => {
  const onTaskToggle = vi.fn()
  const value = "- [ ] one\n\n- [ ] two"
  const { container } = render(<Preview value={value} onTaskToggle={onTaskToggle} />)

  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
  expect(boxes).toHaveLength(2)
  for (const box of boxes) expect(box.disabled).toBe(false)

  fireEvent.click(boxes[1]!)
  const info = onTaskToggle.mock.calls[0]![0]
  const spliced = value.slice(0, info.start) + "[x]" + value.slice(info.end)
  expect(spliced).toBe("- [ ] one\n\n- [x] two")
})

test("a plain (non-task) list is untouched even with onTaskToggle set", () => {
  const onTaskToggle = vi.fn()
  const { container } = render(<Preview value={"- one\n- two"} onTaskToggle={onTaskToggle} />)
  expect(container.querySelector("input[type=checkbox]")).toBeNull()
  expect(container.querySelectorAll("li")).toHaveLength(2)
})
