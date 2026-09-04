/**
 * Guard for ADR-002 §3: every `--stylo-*` colour token must have a value in
 * both the light block and the dark block of `src/styles/tokens.css`. A
 * light-only colour renders wrong under `.dark` and nothing catches it at build
 * time — this does, in CI.
 *
 * "Colour" here means a literal hex / rgb / hsl / oklch value. Tokens whose
 * value is a `var(...)` reference, a `color-mix(...)`, `transparent`,
 * `currentColor`, or a non-colour unit (`0.5rem`) follow their source and are
 * not required in both blocks.
 */
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const file = fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url))
const css = (await readFile(file, "utf8")).replace(/\/\*[\s\S]*?\*\//g, "") // drop comments

const lightBody = css.match(/\.stylo\s*\{([^}]*)\}/)?.[1]
const darkBody = css.match(/:where\([^{]*\{([^}]*)\}/)?.[1]

if (!lightBody || !darkBody) {
  console.error("✗ could not locate the light `.stylo` block and/or the `:where(...)` dark block")
  process.exit(1)
}

const IS_COLOUR = /^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([^)]*\))$/i
const names = (body) => new Set([...body.matchAll(/(--stylo-[\w-]+)\s*:/g)].map((m) => m[1]))
const colours = (body) =>
  new Set(
    [...body.matchAll(/(--stylo-[\w-]+)\s*:\s*([^;]+);/g)]
      .filter(([, , value]) => IS_COLOUR.test(value.trim()))
      .map(([, name]) => name),
  )

const lightNames = names(lightBody)
const darkNames = names(darkBody)
const missingInDark = [...colours(lightBody)].filter((n) => !darkNames.has(n))
const missingInLight = [...colours(darkBody)].filter((n) => !lightNames.has(n))

const problems = []
if (missingInDark.length)
  problems.push(`light-block colours with no dark value:\n    ${missingInDark.join("\n    ")}`)
if (missingInLight.length)
  problems.push(`dark-block colours with no light default:\n    ${missingInLight.join("\n    ")}`)

if (problems.length) {
  console.error(
    `✗ theme token check failed\n\n  ${problems.join("\n\n  ")}\n\n` +
      "  Every --stylo-* colour needs a value in both blocks of src/styles/tokens.css (ADR-002 §3).",
  )
  process.exit(1)
}

console.log(`✓ theme tokens paired — ${colours(lightBody).size} colours in both blocks`)
