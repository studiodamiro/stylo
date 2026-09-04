/**
 * Bundle-size guard. "Zero-bloat" is the pitch, so a chunk that balloons should
 * fail CI, not be noticed months later. Run after `npm run build`.
 *
 * Budgets are gzipped bytes, per chunk, matched by filename prefix (chunks are
 * content-hashed). A legitimate increase means bumping the number here in the
 * same commit — deliberately.
 */
import { gzipSync } from "node:zlib"
import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const dist = fileURLToPath(new URL("../dist/", import.meta.url))

/** prefix -> max gzipped bytes */
const BUDGETS = {
  "stylo.js": 4_000, // entry, always loaded — keep it tiny
  InPlaceView: 22_000, // in-place canvas glue
  Preview: 4_000, // preview glue
  codemirror: 210_000, // CM6 + Lezer — in-place / source / split
  katex: 95_000, // math rendering
  markdown: 70_000, // remark / rehype / react-markdown — preview only
  "icon-paths": 13_000, // shared toolbar glyphs + internal helpers
  wikilink: 2_000,
  callout: 2_000,
}

const files = (await readdir(dist)).filter((f) => f.endsWith(".js"))
const rows = []
const over = []

for (const f of files) {
  const prefix = Object.keys(BUDGETS).find((p) => f === p || f.startsWith(p.replace(/\.js$/, "")))
  const gz = gzipSync(await readFile(dist + f)).length
  if (!prefix) {
    over.push(`  ${f} — no budget entry (add one to scripts/check-bundle-size.mjs)`)
    continue
  }
  const max = BUDGETS[prefix]
  rows.push({ f, gz, max, ok: gz <= max })
  if (gz > max) over.push(`  ${f} — ${gz} B gzip > ${max} B budget (${prefix})`)
}

for (const { f, gz, max, ok } of rows.sort((a, b) => b.gz - a.gz)) {
  console.log(`${ok ? "  " : "✗ "}${f.padEnd(28)} ${String(gz).padStart(7)} B  / ${max} B`)
}

if (over.length) {
  console.error(`\n✗ bundle-size check failed\n${over.join("\n")}\n`)
  process.exit(1)
}
console.log(`\n✓ ${rows.length} chunks within budget`)
