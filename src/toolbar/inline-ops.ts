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

/** Every run of `ch` inside a mark run, in index order. */
function charGroups(run: string, ch: string): { start: number; len: number }[] {
  const out: { start: number; len: number }[] = []
  for (let i = 0; i < run.length;) {
    if (run[i] !== ch) {
      i++
      continue
    }
    let len = 0
    while (run[i + len] === ch) len++
    out.push({ start: i, len })
    i += len
  }
  return out
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
  // other marks (`~~`, `*`) between it and the text, as in `***~~word~~***` or,
  // when marks were applied in an interleaving order, `**~~*word*~~**`. Line the
  // `ch`-groups up outermost-first on both sides (the left run reads outer→inner
  // already; the right run reads inner→outer, so reverse it) and strip the
  // outermost pair whose widths match `mark`.
  const left = markRun(text, from, -1)
  const right = markRun(text, to, 1)
  const lgs = charGroups(left.text, ch)
  const rgs = charGroups(right.text, ch).reverse()
  for (let k = 0; k < Math.min(lgs.length, rgs.length); k++) {
    const lg = lgs[k]!
    const rg = rgs[k]!
    if (!surroundsExactly(lg.len, rg.len, m)) continue
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

/**
 * The span a right-click in a table cell should select so a Format toggle lands
 * cleanly: the text between the delimiters for an inline mark run
 * (`**bold phrase**`, `*em*`, `~~strike~~`, `` `code` ``), but the *whole*
 * construct for a `[label](url)` link or `[[target|label]]` wikilink — its label
 * is not a Markdown context, so Bold must wrap the link, not sit inside it.
 * Returns `null` when `pos` is not in any run. Mirrors `wrapAt` on the canvas.
 */
export function markedContentAt(text: string, pos: number): { from: number; to: number } | null {
  const link = linkAtIn(text, pos)
  if (link) return { from: link.from, to: link.to }
  const wiki = wikiLinkPartsIn(text, pos)
  if (wiki) return { from: wiki.from, to: wiki.to }
  let best: { from: number; to: number } | null = null
  for (const mark of ["**", "~~", "*", "`"]) {
    const re = new RegExp(esc(mark) + "(?!\\s)(?:[^]*?\\S)??" + esc(mark), "g")
    for (let m: RegExpExecArray | null; (m = re.exec(text));) {
      if (m[0].length <= 2 * mark.length) continue
      const from = m.index + mark.length
      const to = m.index + m[0].length - mark.length
      if (pos >= from && pos <= to && (!best || to - from < best.to - best.from)) {
        best = { from, to }
      }
    }
  }
  return best
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

/**
 * Like {@link linkAtIn} but also breaks out the URL and its `[from, to)` span
 * within `text`, for editing just the `(…)` part in place.
 */
export function linkPartsIn(
  text: string,
  head: number,
): { from: number; to: number; label: string; url: string; urlFrom: number; urlTo: number } | null {
  const re = /\[([^\]]*)\]\(([^)]*)\)/g
  for (let m: RegExpExecArray | null; (m = re.exec(text));) {
    const from = m.index
    const to = from + m[0].length
    if (head >= from && head <= to) {
      const label = m[1] ?? ""
      const url = m[2] ?? ""
      const urlFrom = from + 1 + label.length + 2 // `[` + label + `](`
      return { from, to, label, url, urlFrom, urlTo: urlFrom + url.length }
    }
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

/**
 * Like {@link wikiLinkAtIn} but also breaks out the target and its `[from, to)`
 * span within `text`, for editing just the `[[…]]` target in place.
 */
export function wikiLinkPartsIn(
  text: string,
  head: number,
): {
  from: number
  to: number
  target: string
  label: string
  targetFrom: number
  targetTo: number
} | null {
  for (const m of text.matchAll(WIKILINK_PATTERN)) {
    const from = m.index ?? 0
    const to = from + m[0].length
    if (head < from || head > to) continue
    const target = m[1] ?? ""
    const targetFrom = from + 2 // past `[[`
    return {
      from,
      to,
      target,
      label: m[2] ?? "",
      targetFrom,
      targetTo: targetFrom + target.length,
    }
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
