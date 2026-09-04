# Contributing to Stylo

Stylo is a plain-text-first Markdown editor for React with first-class LaTeX
(KaTeX) support. It is a small, reusable component library that other projects
install, so every change is weighed against the cost it imposes on consumers.

---

## Engineering principles

- **Simplicity first.** Prefer the most direct solution with the fewest moving
  parts. Resist premature abstraction.
- **One responsibility per module.** Keep source files in `src/` focused and
  small — a **hard ceiling of 200 lines**. Split a module when it grows past
  that. The public entry point (`src/index.ts`) stays a thin barrel: re-exports
  and types only, no logic.
- **Zero-bloat dependencies.** Do not add a dependency, library, or build tool
  unless it is genuinely necessary. Every dependency must be modular,
  tree-shakeable, and MIT-compatible. Any addition must be justified in an ADR
  with an **Alternatives rejected** section weighing it against at least one
  lighter option. Precedent: Tailwind and `lucide-react` were both rejected for
  the internal UI in favour of CSS Modules and inline SVG (see ADR-002).

## Architecture invariants

- **Plain text is canonical.** `<Stylo>`'s value is a Markdown string. There is
  no intermediate document model that must be serialized back. See
  [ADR-001](./docs/journal/2026-09/2026-09-01_adr-001-editor-architecture.md).
- **Lossless round-trip.** YAML frontmatter, `[[wikilinks]]`, and `$…$` / `$$…$$`
  math must survive a full edit cycle unchanged and stay editable by Obsidian and
  other plain-Markdown tools.
- **Compose from primitives.** CodeMirror 6 for the editing surface;
  `remark` / `rehype` + KaTeX for rendering. Do not adopt a ProseMirror- or
  Lexical-style editor framework.

## Making changes

- Touch only the lines and files necessary for the change at hand.
- Discuss scope before large or architectural changes — open an issue or a draft
  ADR first.
- Verify before opening a PR: `npm run format:check`, `npm run typecheck`,
  `npm run build`, and `npm run test` must all pass. CI runs the same set.
- If something fails or stalls, find the root cause rather than working around
  it.

---

## Documentation standards

Whenever an architectural subsystem or core feature is introduced or modified,
document it synchronously across two layers.

### Wiki (`docs/wiki/`)

Concept-based, publication-ready documentation (Quartz / Docusaurus / Obsidian
Publish). Subfolders: `architecture/`, `guides/`, `reference/`, with
`docs/wiki/index.md` as the navigation map. Include the systems rationale — why a
decision was made, benchmarks, gotchas — and Mermaid diagrams for data flow. The
wiki is present-tense: it always describes how the system works now.

### Engineering journal & ADRs (`docs/journal/YYYY-MM/`)

Chronological log of milestones and formal Architectural Decision Records.

- Monthly date folders: `docs/journal/YYYY-MM/`.
- Filename format `YYYY-MM-DD_topic-slug.md`; ADRs use
  `YYYY-MM-DD_adr-NNN-topic-slug.md`.
- The master ADR index lives in `docs/PROJECT_JOURNAL.md`, newest first.

**ADR content standard.** Every ADR carries, in order: **Status**, **Date**,
**Deciders**, **Context**, **Decision**, **Consequences** (both positive and
negative / costs), and **Alternatives rejected**. The rejected-alternatives
section is mandatory — name each option that was genuinely on the table and why
it lost. An ADR without it is a proposal, not a decision record.

**Scope discipline.** When an ADR covers a feature set, split it into _"Accepted
for the first release"_ and _"Deferred (post-v1, additive)"_. Deferred items must
not gate the first release. If a decision is time-boxed for re-evaluation (a
browser capability maturing, an ecosystem stabilising), record the revisit
trigger explicitly.

**Amendment & supersession.** An ADR is immutable once its decisions have been
implemented; a later change of course is a **new** ADR. An
Accepted-but-not-yet-implemented ADR may still be revised in place. A new ADR
that changes an earlier one says so in its **Status** line
(`Accepted — amends ADR-NNN …` / `… supersedes ADR-NNN`), and the earlier ADR
gets a pointer forward: a note in its **Status** line and an inline blockquote at
the specific decision that moved. Never silently edit the earlier ADR's body to
match.

**Index & cross-reference sync.** Adding or amending an ADR is not complete
until, in the same change: the `docs/PROJECT_JOURNAL.md` ADR table is updated;
the `docs/wiki/index.md` ADR table is updated; and every wiki page whose content
derives from the decision links to the ADR and reflects its current state.

### Obsidian YAML frontmatter

Every file under `docs/` begins with valid Obsidian YAML frontmatter. Root meta
files (`README.md`, `CONTRIBUTING.md`, `LICENSE`) are exempt.

```yaml
---
title: "Article Title"
created: YYYY-MM-DD
type: wiki-architecture # wiki-architecture | wiki-guides | wiki-reference | journal | adr
parent: index
tags:
  - stylo/architecture
  - engineering/adr
---
```

Use a controlled tag vocabulary; do not invent per-file variants:

| Content                          | Tags                                         |
| -------------------------------- | -------------------------------------------- |
| Wiki — architecture              | `stylo/architecture`, `engineering/standard` |
| Wiki — guides / reference / home | `stylo/wiki`, `engineering/standard`         |
| ADR                              | `stylo/architecture`, `engineering/adr`      |
| Journal milestone                | `stylo/journal`, `engineering/milestone`     |

### Portfolio-safe contents

The journal, ADRs, and wiki are committed and published. Keep their contents
generic: generic file, directory, and repository references; no credentials,
private URLs, or internal-only context. Write every entry as if a reviewer will
read it.

---

## Repository conventions

- **The repository stays vendor-neutral.** Editor-specific and local workspace
  configuration — e.g. `.vscode/`, `.cursor/`, `.agents/` — is `.gitignore`d and
  never committed. Standards that belong to the project live here and in `docs/`.
- **Commit messages**: imperative subject, prefixed by area
  (`docs:`, `feat:`, `fix:`, `chore:`). Explain the _why_ in the body.
- **Branches**: work on a topic branch off `main`; open a PR.

## Commands

Vite in library mode; TypeScript emits the declarations.

| Task                 | Command                |
| -------------------- | ---------------------- |
| Dev / playground     | `npm run dev`          |
| Format               | `npm run format`       |
| Check formatting     | `npm run format:check` |
| Typecheck            | `npm run typecheck`    |
| Build library bundle | `npm run build`        |
| Run tests            | `npm run test`         |
