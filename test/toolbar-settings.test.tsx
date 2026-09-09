import { useState } from "react"
import { afterEach, expect, test } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { StyloToolbarSettings } from "../src/toolbar-settings"
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

test("'move down' reorders the bar", () => {
  const { container } = render(<Harness initial={["bold", "italic"]} />)

  fireEvent.click(container.querySelector('[aria-label="Move Bold down"]')!)

  expect(items(container)).toBe("italic,bold")
})

test("Arrow keys reorder a focused row", () => {
  const { container } = render(<Harness initial={["bold", "italic", "link"]} />)
  const row = container.querySelectorAll("ul")[0]!.querySelectorAll("li")[2]!

  fireEvent.keyDown(row, { key: "ArrowUp" })

  expect(items(container)).toBe("bold,link,italic")
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
  const { container } = render(<Harness initial={["bold", "italic"]} />)

  fireEvent.click(container.querySelector('[aria-label="Move Bold down"]')!)

  expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
    "Bold moved to position 2 of 2",
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
