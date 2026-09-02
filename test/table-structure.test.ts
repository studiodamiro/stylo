import { expect, test } from "vitest"
import type { Align } from "../src/toolbar/table-grid"
import {
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  setAlign,
} from "../src/inplace/table-structure"

const model = () => ({
  rows: [
    ["a", "b"],
    ["c", "d"],
    ["e", "f"],
  ],
  aligns: ["", ""] as Align[],
})

test("insertColumn adds a blank cell to every row and an align slot", () => {
  const m = model()
  insertColumn(m, 1)
  expect(m.rows).toEqual([
    ["a", "", "b"],
    ["c", "", "d"],
    ["e", "", "f"],
  ])
  expect(m.aligns).toEqual(["", "", ""])
})

test("insertColumn clamps an out-of-range index to an append", () => {
  const m = model()
  insertColumn(m, 99)
  expect(m.rows[0]).toEqual(["a", "b", ""])
})

test("deleteColumn removes the column but refuses the last one", () => {
  const m = model()
  deleteColumn(m, 0)
  expect(m.rows).toEqual([["b"], ["d"], ["f"]])
  expect(m.aligns).toEqual([""])
  deleteColumn(m, 0)
  expect(m.rows).toEqual([["b"], ["d"], ["f"]])
})

test("insertRow adds a blank body row and never above the header", () => {
  const m = model()
  insertRow(m, 0)
  expect(m.rows.length).toBe(4)
  expect(m.rows[0]).toEqual(["a", "b"])
  expect(m.rows[1]).toEqual(["", ""])
})

test("deleteRow removes a body row but keeps the header and one body row", () => {
  const m = model()
  deleteRow(m, 1)
  expect(m.rows).toEqual([
    ["a", "b"],
    ["e", "f"],
  ])
  deleteRow(m, 1) // only one body row left — refused
  deleteRow(m, 0) // the header — refused
  expect(m.rows).toEqual([
    ["a", "b"],
    ["e", "f"],
  ])
})

test("setAlign updates one column's alignment", () => {
  const m = model()
  setAlign(m, 1, "center")
  expect(m.aligns).toEqual(["", "center"])
})
