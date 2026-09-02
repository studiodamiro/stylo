import { WIKILINK_PATTERN } from "../wikilink"

/** Regex-escape a literal so it can be spliced into a pattern. */
export function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** The characters that can stack as inline marks around a span. */
export const MARK_CHARS = "*~`$"

/** The maximal run of {@link MARK_CHARS} touching `pos` on the given side of `s`. */
function markRun(s: string, pos: number, dir: -1 | 1): { text: string; from: number } {
  let from = pos
  let to = pos
  if (dir < 0) while (from > 0 && MARK_CHARS.includes(s[from - 1]!)) from--
  else while (to < s.length && MARK_CHARS.includes(s[to]!)) to++
  return { text: s.slice(from, dir < 0 ? pos : to), from }
}

/** Offset and length of the first group of `ch` inside a mark run. */
function charGroup(run: string, ch: string): { start: number; len: number } | null {
  const start = run.indexOf(ch)
  if (start < 0) return null
  let len = 0
  while (run[start + len] === ch) len++
  return { start, len }
}

/**
 * Do `before` / `after` counts of the mark character flanking a range represent
 * an instance of exactly `mark` to strip? A `**`/`~~` needs at least its length;
 * a single `*` needs an *odd* count — so `*x*` and `***x***` unwrap the italic,
 * but `**x**` keeps the bold and the italic nests instead.
 */
function surroundsExactly(before: number, after: number, m: number): boolean {
  if (before < m || after < m) return false
  return m > 1 || (before % 2 === 1 && after % 2 === 1)
}

/** Non-overlapping edits plus the selection (post-edit coordinates) to follow. */
export interface InlineOp {
  changes: { from: number; to: number; insert: string }[]
  from: number
  to: number
}

/** A rewritten string plus the selection that should follow it. */
export interface InlineStr {
  text: string
  from: number
  to: number
}

/**
 * Toggle an inline wrapping mark (`**`, `*`, `~~`, `` ` ``, `$`) around `[from,
 * to)` of `text`: unwrap a span already wrapped (marks inside or just around the
 * selection), else wrap it; an empty range gets an empty pair. Applying `*` to
 * `**bold**` (or `**` to `*em*`) nests rather than eating a marker.
 */
export function wrapOp(text: string, from: number, to: number, mark: string): InlineOp {
  const m = mark.length
  const ch = mark[0]!
  const inner = text.slice(from, to)

  // The selection covers the marks: `**bold**` is selected.
  let lead = 0
  while (inner[lead] === ch) lead++
  let tail = 0
  while (inner[inner.length - 1 - tail] === ch) tail++
  if (
    inner.length >= 2 * m &&
    inner.startsWith(mark) &&
    inner.endsWith(mark) &&
    surroundsExactly(lead, tail, m)
  ) {
    return {
      changes: [
        { from, to: from + m, insert: "" },
        { from: to - m, to, insert: "" },
      ],
      from,
      to: to - 2 * m,
    }
  }

  // `mark` is somewhere in the stack of marks flanking the range — possibly with
  // other marks (`~~`, `*`) between it and the text, as in `***~~word~~***`.
  // Strip `m` from the inner edge of its char-group on each side.
  const left = markRun(text, from, -1)
  const right = markRun(text, to, 1)
  const lg = charGroup(left.text, ch)
  const rg = charGroup(right.text, ch)
  if (lg && rg && surroundsExactly(lg.len, rg.len, m)) {
    const lInner = left.from + lg.start + lg.len // group's edge nearest the text
    const rInner = to + rg.start
    return {
      changes: [
        { from: lInner - m, to: lInner, insert: "" },
        { from: rInner, to: rInner + m, insert: "" },
      ],
      from: from - m,
      to: to - m,
    }
  }

  // Otherwise wrap.
  return {
    changes: [
      { from, to: from, insert: mark },
      { from: to, to: to, insert: mark },
    ],
    from: from + m,
    to: to + m,
  }
}

/** Apply non-overlapping {@link InlineOp} changes to a string (right to left). */
export function applyChanges(
  text: string,
  changes: { from: number; to: number; insert: string }[],
): string {
  let out = text
  for (const c of [...changes].sort((a, b) => b.from - a.from)) {
    out = out.slice(0, c.from) + c.insert + out.slice(c.to)
  }
  return out
}

/** {@link wrapOp} resolved against a plain string — for editing one table cell. */
export function wrapString(text: string, from: number, to: number, mark: string): InlineStr {
  const op = wrapOp(text, from, to, mark)
  return { text: applyChanges(text, op.changes), from: op.from, to: op.to }
}

/** The `[text](url)` span of `text` covering `head`, or `null`. */
export function linkAtIn(
  text: string,
  head: number,
): { from: number; to: number; label: string } | null {
  const re = /\[([^\]]*)\]\([^)]*\)/g
  for (let m: RegExpExecArray | null; (m = re.exec(text));) {
    const from = m.index
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, label: m[1] ?? "" }
  }
  return null
}

/** Toggle `[text](url)` around `[from, to)` of `text` — wrap, or unlink to the label. */
export function linkString(text: string, from: number, to: number): InlineStr {
  const hit = linkAtIn(text, from)
  if (hit) {
    return {
      text: text.slice(0, hit.from) + hit.label + text.slice(hit.to),
      from: hit.from,
      to: hit.from + hit.label.length,
    }
  }
  const label = text.slice(from, to) || "text"
  const urlAt = from + label.length + 3 // past `[` + label + `](`
  return {
    text: text.slice(0, from) + `[${label}](url)` + text.slice(to),
    from: urlAt,
    to: urlAt + 3,
  }
}

/** The `[[target|label]]` span of `text` covering `head`, or `null`. */
export function wikiLinkAtIn(
  text: string,
  head: number,
): { from: number; to: number; label: string } | null {
  for (const m of text.matchAll(WIKILINK_PATTERN)) {
    const from = m.index ?? 0
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, label: m[2] || m[1] || "" }
  }
  return null
}

/** Toggle `[[target]]` around `[from, to)` of `text` — wrap, or unwrap to the display text. */
export function wikiLinkString(text: string, from: number, to: number): InlineStr {
  const hit = wikiLinkAtIn(text, from)
  if (hit) {
    return {
      text: text.slice(0, hit.from) + hit.label + text.slice(hit.to),
      from: hit.from,
      to: hit.from + hit.label.length,
    }
  }
  const target = text.slice(from, to) || "target"
  return {
    text: text.slice(0, from) + `[[${target}]]` + text.slice(to),
    from: from + 2,
    to: from + 2 + target.length,
  }
}
