import { redo, undo } from "@codemirror/commands"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import {
  frontmatterActive,
  horizontalRuleActive,
  linePrefixActive,
  toggleFrontmatter,
  toggleHeading,
  toggleHorizontalRule,
  toggleLinePrefix,
  type LinePrefixSpec,
} from "./block"
import { fencedCodeActive, mathBlockActive, toggleFencedCode, toggleMathBlock } from "./fence"
import {
  linkActive,
  toggleLink,
  toggleWikiLink,
  toggleWrap,
  wikiLinkActive,
  wrapActive,
} from "./inline"
import { insertTable, tableActive } from "./table"

export interface ToolbarCommand {
  id: ToolbarCommandId
  /** Tooltip and accessible label. */
  title: string
  /** Mutate the document against the live view; returns true when handled. */
  run: (view: EditorView) => boolean
  /** Reflected as the button's pressed state. */
  isActive?: (state: EditorState) => boolean
  /**
   * True when the command can't apply at the current selection — the button is
   * rendered `disabled` and the shortcut is a no-op. Block commands set this
   * inside a table, where a `## ` prefix or a `---` line would break the row.
   */
  disabled?: (state: EditorState) => boolean
  /** Default key bindings in CodeMirror `key` syntax. */
  keys?: string[]
}

/** Any list marker — bullet, ordered, or task — with `[1]` capturing the indent. */
const LIST_MARKER = /^(\s*)(?:[-*+] \[[ xX]\] +|\d+\. +|[-*+] +)/

const QUOTE: LinePrefixSpec = { match: /^ {0,3}> ?/, insert: "> " }
const BULLET: LinePrefixSpec = {
  match: /^(\s*)[-*+] +(?!\[[ xX]\])/,
  insert: "- ",
  siblings: LIST_MARKER,
}
const ORDERED: LinePrefixSpec = {
  match: /^(\s*)\d+\. +/,
  insert: (n) => `${n + 1}. `,
  siblings: LIST_MARKER,
}
const TASK: LinePrefixSpec = {
  match: /^(\s*)[-*+] \[[ xX]\] +/,
  insert: "- [ ] ",
  siblings: LIST_MARKER,
}

function history(id: "undo" | "redo", title: string, cmd: typeof undo): ToolbarCommand {
  return {
    id,
    title,
    run: (view) => {
      const ok = cmd(view)
      view.focus()
      return ok
    },
  }
}

function wrap(id: ToolbarCommandId, title: string, mark: string, keys?: string[]): ToolbarCommand {
  return {
    id,
    title,
    run: (view) => toggleWrap(view, mark),
    isActive: (state) => wrapActive(state, mark),
    keys,
  }
}

function heading(level: 1 | 2 | 3): ToolbarCommand {
  const marker = new RegExp(`^#{${level}} `)
  return {
    id: `h${level}` as ToolbarCommandId,
    title: `Heading ${level}`,
    run: (view) => toggleHeading(view, level),
    isActive: (state) => marker.test(state.doc.lineAt(state.selection.main.head).text),
    disabled: tableActive,
    keys: [`Mod-Alt-${level}`],
  }
}

function prefix(id: ToolbarCommandId, title: string, spec: LinePrefixSpec): ToolbarCommand {
  return {
    id,
    title,
    run: (view) => toggleLinePrefix(view, spec),
    isActive: (state) => linePrefixActive(state, spec.match),
    disabled: tableActive,
  }
}

/** Every built-in command, in a stable order. The toolbar picks from these by id. */
export const BUILTIN_COMMANDS: ToolbarCommand[] = [
  history("undo", "Undo", undo),
  history("redo", "Redo", redo),
  heading(1),
  heading(2),
  heading(3),
  wrap("bold", "Bold", "**", ["Mod-b"]),
  wrap("italic", "Italic", "*", ["Mod-i"]),
  wrap("strike", "Strikethrough", "~~"),
  wrap("code", "Inline code", "`"),
  {
    // In a table cell a fenced block has no valid Markdown, so degrade to
    // inline `` `code` `` there.
    id: "codeBlock",
    title: "Code block",
    run: (view) => (tableActive(view.state) ? toggleWrap(view, "`") : toggleFencedCode(view)),
    isActive: (state) => (tableActive(state) ? wrapActive(state, "`") : fencedCodeActive(state)),
  },
  { id: "link", title: "Link", run: toggleLink, isActive: linkActive, keys: ["Mod-k"] },
  {
    id: "wikilink",
    title: "Wikilink",
    run: toggleWikiLink,
    isActive: wikiLinkActive,
    keys: ["Mod-Shift-k"],
  },
  prefix("quote", "Blockquote", QUOTE),
  prefix("bulletList", "Bulleted list", BULLET),
  prefix("orderedList", "Numbered list", ORDERED),
  prefix("task", "Task list", TASK),
  {
    id: "hr",
    title: "Divider",
    run: toggleHorizontalRule,
    isActive: horizontalRuleActive,
    disabled: tableActive,
  },
  {
    id: "frontmatter",
    title: "Frontmatter",
    run: toggleFrontmatter,
    isActive: frontmatterActive,
    disabled: tableActive,
  },
  { id: "table", title: "Table", run: insertTable, isActive: tableActive, disabled: tableActive },
  wrap("math", "Inline math", "$"),
  {
    // In a table cell, degrade the `$$` block to inline `$…$` math.
    id: "mathBlock",
    title: "Block math",
    run: (view) => (tableActive(view.state) ? toggleWrap(view, "$") : toggleMathBlock(view)),
    isActive: (state) => (tableActive(state) ? wrapActive(state, "$") : mathBlockActive(state)),
  },
]

export const BUILTIN_BY_ID: Record<string, ToolbarCommand> = Object.fromEntries(
  BUILTIN_COMMANDS.map((c) => [c.id, c]),
)
