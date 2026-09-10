import { expect, test, vi } from "vitest"
import { EmbedRegistry } from "../src/inplace/embed-registry"

const el = () => document.createElement("div")

test("allocate hands out monotonic ids", () => {
  const r = new EmbedRegistry()
  expect(r.allocate()).toBe(1)
  expect(r.allocate()).toBe(2)
  expect(r.allocate()).toBe(3)
})

test("add / remove are reflected in the snapshot after a microtask", async () => {
  const r = new EmbedRegistry()
  r.add({ id: 1, ref: "Note", el: el() })
  expect(r.getSnapshot()).toEqual([]) // not flushed yet
  await Promise.resolve()
  expect(r.getSnapshot().map((s) => s.ref)).toEqual(["Note"])

  r.remove(1)
  await Promise.resolve()
  expect(r.getSnapshot()).toEqual([])
})

test("the snapshot reference is stable between mutations", async () => {
  const r = new EmbedRegistry()
  r.add({ id: 1, ref: "A", el: el() })
  await Promise.resolve()
  const first = r.getSnapshot()
  expect(r.getSnapshot()).toBe(first)
})

test("many changes in one tick notify subscribers once", async () => {
  const r = new EmbedRegistry()
  const listener = vi.fn()
  r.subscribe(listener)
  r.add({ id: 1, ref: "A", el: el() })
  r.add({ id: 2, ref: "B", el: el() })
  r.remove(1)
  expect(listener).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(listener).toHaveBeenCalledTimes(1)
  expect(r.getSnapshot().map((s) => s.ref)).toEqual(["B"])
})

test("unsubscribe stops notifications", async () => {
  const r = new EmbedRegistry()
  const listener = vi.fn()
  const off = r.subscribe(listener)
  off()
  r.add({ id: 1, ref: "A", el: el() })
  await Promise.resolve()
  expect(listener).not.toHaveBeenCalled()
})
