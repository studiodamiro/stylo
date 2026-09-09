import type { ToolbarCommandId } from "../types"

/**
 * Display labels for the built-in command ids — the single source of truth for
 * the button title / accessible name. `commands.ts` owns the *behaviour* of each
 * command and imports CodeMirror to do it; this module is pure data, so surfaces
 * that only need to *name* a command (the toolbar customizer, docs tooling) can
 * import it without pulling the editor in.
 *
 * `test/toolbar-settings.test.tsx` asserts these stay in step with
 * `BUILTIN_COMMANDS` — a renamed command title there without a change here fails
 * the build.
 */
export const BUILTIN_LABELS: Record<ToolbarCommandId, string> = {
  undo: "Undo",
  redo: "Redo",
  save: "Save",
  search: "Find / replace",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  body: "Body",
  bold: "Bold",
  italic: "Italic",
  strike: "Strikethrough",
  underline: "Underline",
  code: "Inline code",
  codeBlock: "Code block",
  link: "Link",
  wikilink: "Wikilink",
  quote: "Blockquote",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  task: "Task list",
  hr: "Divider",
  frontmatter: "Frontmatter",
  table: "Table",
  math: "Inline math",
  mathBlock: "Block math",
}

/** Every built-in command id, in the canonical order labels are declared above. */
export const ALL_BUILTIN_IDS = Object.keys(BUILTIN_LABELS) as ToolbarCommandId[]
