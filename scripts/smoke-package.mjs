/**
 * Packaging smoke: prove a real downstream project can install and use the
 * published package.
 *
 *   npm pack  →  install the tarball into a throwaway consumer  →  tsc  →  vite build
 *
 * Catches what the in-repo checks cannot: a broken `exports` map, a missing or
 * malformed `.d.ts`, an accidental hard dependency, or a React-19-only type in
 * the published types — the consumer is pinned to `@types/react@18` to keep the
 * `>=18` peer range honest (folds in the old "react18 .d.ts" concern).
 *
 * Run: `npm run check:package`. Leaves the work dir in place on failure so the
 * error can be inspected; removes it (and the tarball) on success.
 */
import { execFileSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repo = resolve(fileURLToPath(new URL(".", import.meta.url)), "..")
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" })

// 1. Build, then pack without re-triggering the `prepare` lifecycle (whose build
// output would otherwise pollute stdout). The tarball name is deterministic:
// `@damiro/stylo` → `damiro-stylo-<version>.tgz`.
const { name, version } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"))
run("npm", ["run", "build"], repo)
run("npm", ["pack", "--ignore-scripts", "--silent"], repo)
const tarball = join(repo, `${name.replace("@", "").replace("/", "-")}-${version}.tgz`)

// 2. Throwaway consumer.
const work = mkdtempSync(join(tmpdir(), "stylo-consumer-"))
console.log(`\n· consumer: ${work}\n`)
cpSync(join(repo, "scripts/consumer"), work, { recursive: true })
writeFileSync(
  join(work, "package.json"),
  JSON.stringify(
    {
      name: "stylo-consumer-smoke",
      private: true,
      type: "module",
      dependencies: {
        "@damiro/stylo": `file:${tarball}`,
        react: "^18",
        "react-dom": "^18",
        "@codemirror/commands": "^6",
        "@codemirror/lang-markdown": "^6",
        "@codemirror/language": "^6",
        "@codemirror/state": "^6",
        "@codemirror/view": "^6",
        "@lezer/common": "^1",
        "@lezer/highlight": "^1",
      },
      devDependencies: {
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "@vitejs/plugin-react": "^4",
        typescript: "^5",
        vite: "^5",
      },
    },
    null,
    2,
  ),
)

let failed = false
try {
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], work)
  run("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], work)
  run("npx", ["vite", "build", "--logLevel", "warn"], work)
} catch (err) {
  failed = true
  console.error(`\n✗ packaging smoke failed — left ${work} for inspection\n${err.message}`)
}

rmSync(tarball, { force: true })
if (failed) process.exit(1)
rmSync(work, { recursive: true, force: true })
console.log("\n✓ packaging smoke passed — install, tsc (React 18 types), and vite build all clean")
