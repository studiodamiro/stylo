export type Align = "" | "left" | "center" | "right"

export interface Grid {
  /** Content rows, header first. The delimiter row is not included. */
  rows: string[][]
  aligns: Align[]
}

/** A GFM delimiter row: only pipes, dashes, colons, spaces, and at least one dash. */
export function isDelimiterLine(line: string): boolean {
  const t = line.trim()
  return t.includes("-") && t.includes("|") && /^[\s|:-]+$/.test(t)
}

/** Split a table row on unescaped `|`, dropping one outer pipe each side. */
export function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ""
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "\\|"
      i++
    } else if (s[i] === "|") {
      cells.push(cur.trim())
      cur = ""
    } else {
      cur += s[i]
    }
  }
  cells.push(cur.trim())
  return cells
}

function alignFromSpec(spec: string): Align {
  const s = spec.trim()
  const l = s.startsWith(":")
  const r = s.endsWith(":")
  return l && r ? "center" : r ? "right" : l ? "left" : ""
}

/** Parse the raw lines of a table (delimiter expected at index 1). */
export function parseGrid(lines: string[]): Grid | null {
  if (lines.length < 2 || !isDelimiterLine(lines[1]!)) return null
  const aligns = splitRow(lines[1]!).map(alignFromSpec)
  const rows = lines.filter((_, i) => i !== 1).map(splitRow)
  const cols = Math.max(aligns.length, ...rows.map((r) => r.length))
  const norm = rows.map((r) => {
    const c = r.slice(0, cols)
    while (c.length < cols) c.push("")
    return c
  })
  const a = aligns.slice(0, cols)
  while (a.length < cols) a.push("")
  return { rows: norm, aligns: a }
}

/** Display width of a cell — an escaped pipe counts as one character. */
function cellWidth(cell: string): number {
  return cell.replace(/\\\|/g, "|").length
}

function pad(cell: string, width: number, align: Align): string {
  const gap = width - cellWidth(cell)
  if (gap <= 0) return cell
  if (align === "right") return " ".repeat(gap) + cell
  if (align === "center") {
    const l = Math.floor(gap / 2)
    return " ".repeat(l) + cell + " ".repeat(gap - l)
  }
  return cell + " ".repeat(gap)
}

function delimiterCell(width: number, align: Align): string {
  const w = Math.max(3, width)
  if (align === "left") return ":" + "-".repeat(w - 1)
  if (align === "right") return "-".repeat(w - 1) + ":"
  if (align === "center") return ":" + "-".repeat(w - 2) + ":"
  return "-".repeat(w)
}

/** Serialize a grid to an aligned pipe table — deterministic and idempotent. */
export function serializeGrid(grid: Grid): string {
  const cols = grid.aligns.length
  const widths: number[] = []
  for (let c = 0; c < cols; c++) {
    let w = 3
    for (const row of grid.rows) w = Math.max(w, cellWidth(row[c] ?? ""))
    widths.push(w)
  }
  const rowLine = (cells: string[]) =>
    "| " + cells.map((cell, c) => pad(cell ?? "", widths[c]!, grid.aligns[c]!)).join(" | ") + " |"
  const out = [rowLine(grid.rows[0] ?? [])]
  out.push("| " + grid.aligns.map((a, c) => delimiterCell(widths[c]!, a)).join(" | ") + " |")
  for (let r = 1; r < grid.rows.length; r++) out.push(rowLine(grid.rows[r]!))
  return out.join("\n")
}

export interface CellSpan {
  start: number
  contentStart: number
  contentEnd: number
  end: number
}

/** The `|`-delimited cell spans of a line (positions relative to line start). */
export function cellBounds(line: string): CellSpan[] {
  const pipes: number[] = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\") {
      i++
      continue
    }
    if (line[i] === "|") pipes.push(i)
  }
  const out: CellSpan[] = []
  for (let p = 0; p < pipes.length - 1; p++) {
    const start = pipes[p]! + 1
    const end = pipes[p + 1]!
    const seg = line.slice(start, end)
    const lead = seg.length - seg.trimStart().length
    const trail = seg.length - seg.trimEnd().length
    out.push({ start, contentStart: start + lead, contentEnd: end - trail, end })
  }
  return out
}
