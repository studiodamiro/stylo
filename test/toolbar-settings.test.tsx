import { useState } from "react"
import { afterEach, expect, test } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { StyloToolbarSettings } from "../src/toolbar-settings"
import { move } from "../src/toolbar-settings/items"
import { BUILTIN_LABELS } from "../src/toolbar/labels"
import { BUILTIN_BY_ID } from "../src/toolbar/commands"
import { DEFAULT_TOOLBAR_ITEMS } from "../src/toolbar/config"
import type { ToolbarItem } from "../src/types"

afterEach(cleanup)

function Harness({ initial }: { initial: ToolbarItem[] }) {
  const [items, setItems] = useState<ToolbarItem[]>(initial)
  return (
    <div>
      <StyloToolbarSettings value={items} onChange={setItems} />
      <output data-testid="items">{items.join(",")}</output>
    </div>
  )
}

const items = (c: HTMLElement) => c.querySelector('[data-testid="items"]')!.textContent

test("splits value into 'on the bar' and everything else into 'available'", () => {
  const { container } = render(<Harness initial={["bold", "italic", "|"]} />)
  const uls = container.querySelectorAll("ul")
  const onBar = uls[0]!
  const available = uls[1]!

  expect(onBar.textContent).toContain("Bold")
  expect(onBar.textContent).toContain("Italic")
  expect(onBar.textContent).toContain("Separator")
  expect(available.textContent).toContain("Link")
  expect(available.textContent).not.toContain("Bold") // already on the bar
})

test("every bar row has a labelled drag handle; the palette rows don't", () => {
  const { container } = render(<Harness initial={["bold", "italic", "|"]} />)

  const handles = container.querySelectorAll('[aria-label^="Reorder "]')
  expect(handles).toHaveLength(3) // one per slot on the bar, separator included
  expect(handles[0]!.getAttribute("aria-label")).toBe("Reorder Bold, position 1 of 3")

  const [, available] = container.querySelectorAll("ul")
  expect(available!.querySelectorAll('[aria-label^="Reorder "]')).toHaveLength(0)
})

test("move() reorders items — the operation a drag performs", () => {
  expect(move(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
  expect(move(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"])
  expect(move(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"])
})

test("Remove moves an item to 'available'; Add puts it back", () => {
  const { container } = render(<Harness initial={["bold", "link"]} />)

  fireEvent.click(container.querySelector('[aria-label="Remove Link from the bar"]')!)
  expect(items(container)).toBe("bold")

  fireEvent.click(container.querySelector('[aria-label="Add Link to the bar"]')!)
  expect(items(container)).toBe("bold,link")
})

test("'Add separator' appends a separator; 'Reset' restores the default", () => {
  const { container } = render(<Harness initial={["bold"]} />)

  fireEvent.click(container.querySelector('button[class*="textButton"]')!) // "Add separator" is first
  expect(items(container)).toBe("bold,|")

  const buttons = [...container.querySelectorAll("button")]
  fireEvent.click(buttons.find((b) => b.textContent === "Reset to default")!)
  expect(items(container)).toBe(DEFAULT_TOOLBAR_ITEMS.join(","))
})

test("an action is announced in the live region", () => {
  const { container } = render(<Harness initial={["bold", "link"]} />)

  fireEvent.click(container.querySelector('[aria-label="Remove Link from the bar"]')!)

  expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
    "Link removed from the bar",
  )
})

test("BUILTIN_LABELS stays in step with BUILTIN_COMMANDS", () => {
  const commandIds = Object.keys(BUILTIN_BY_ID).sort()
  const labelIds = Object.keys(BUILTIN_LABELS).sort()
  expect(labelIds).toEqual(commandIds)

  // `heading()` builds its title as `Heading ${level}`; the rest are literals
  // that must match the command's own `title`.
  for (const [id, cmd] of Object.entries(BUILTIN_BY_ID)) {
    expect(BUILTIN_LABELS[id as keyof typeof BUILTIN_LABELS]).toBe(cmd.title)
  }
})
