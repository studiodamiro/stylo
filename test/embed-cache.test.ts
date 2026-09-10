import { expect, test, vi } from "vitest"
import type { EmbedSource } from "../src/types"
import { peekEmbed, resolveEmbed } from "../src/render/embed-cache"

test("a settled ref resolves once and is then served from cache", async () => {
  const source = vi.fn<EmbedSource>((ref) => `node:${ref}`)
  expect(await resolveEmbed(source, "A")).toBe("node:A")
  expect(await resolveEmbed(source, "A")).toBe("node:A")
  expect(source).toHaveBeenCalledTimes(1)
  expect(peekEmbed(source, "A")).toEqual({ node: "node:A" })
})

test("concurrent resolves of the same ref share one call", async () => {
  const source = vi.fn<EmbedSource>(async (ref) => `node:${ref}`)
  const [a, b] = await Promise.all([resolveEmbed(source, "X"), resolveEmbed(source, "X")])
  expect(a).toBe(b)
  expect(source).toHaveBeenCalledTimes(1)
})

test("null is a cached value, not a miss", async () => {
  const source = vi.fn<EmbedSource>(() => null)
  expect(await resolveEmbed(source, "N")).toBeNull()
  expect(peekEmbed(source, "N")).toEqual({ node: null })
  await resolveEmbed(source, "N")
  expect(source).toHaveBeenCalledTimes(1)
})

test("peek is undefined while a resolve is still in flight", () => {
  const source: EmbedSource = () => new Promise(() => {})
  void resolveEmbed(source, "pending")
  expect(peekEmbed(source, "pending")).toBeUndefined()
})

test("a rejection is not cached — the next resolve retries", async () => {
  const source = vi.fn<EmbedSource>(() => Promise.reject(new Error("boom")))
  await expect(resolveEmbed(source, "R")).rejects.toThrow("boom")
  expect(peekEmbed(source, "R")).toBeUndefined()
  await expect(resolveEmbed(source, "R")).rejects.toThrow("boom")
  expect(source).toHaveBeenCalledTimes(2)
})

test("the cache is capped and evicts the oldest ref", async () => {
  const source = vi.fn<EmbedSource>((ref) => `node:${ref}`)
  for (let i = 0; i < 70; i++) await resolveEmbed(source, `ref-${i}`)
  // 64-entry cap: the earliest refs are gone, the most recent survive.
  expect(peekEmbed(source, "ref-0")).toBeUndefined()
  expect(peekEmbed(source, "ref-69")).toEqual({ node: "node:ref-69" })
})

test("caches are isolated per embedSource identity", async () => {
  const a: EmbedSource = (ref) => `a:${ref}`
  const b: EmbedSource = (ref) => `b:${ref}`
  expect(await resolveEmbed(a, "same")).toBe("a:same")
  expect(await resolveEmbed(b, "same")).toBe("b:same")
  expect(peekEmbed(a, "same")).toEqual({ node: "a:same" })
  expect(peekEmbed(b, "same")).toEqual({ node: "b:same" })
})
