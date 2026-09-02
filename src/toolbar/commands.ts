import { redo, undo } from "@codemirror/commands"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import {
  clearHeading,
  frontmatterActive,
  horizontalRuleActive,
  linePrefixActive,
  toggleFrontmatter,
  toggleHeading,
  toggleHorizontalRule,
  toggleLinePrefix,
  type LinePrefixSpec,
} from "./block"
import { frontmatterRange } from "../frontmatter"
import { runInlineInCell } from "./cell-inline"
import { fencedCodeActive, mathBlockActive, toggleFencedCode, toggleMathBlock } from "./fence"
import {
  linkActive,
  toggleLink,
  toggleWikiLink,
  toggleWrap,
  wikiLinkActive,
  wrapActive,
} from "./inline"
import { linkString, wikiLinkString, wrapString } from "./inline-ops"
import { insertTable, tableActive } from "./table"

// --- context predicates: where a command can't sensibly apply ---

/** Caret's line is an ATX heading (`#` … `######`). */
const inHeading = (s: EditorState): boolean =>
  /^\s{0,3}#{1,6}(?:\s|$)/.test(s.doc.lineAt(s.selection.main.head).text)

/** Caret is inside the leading `---` YAML block. */
const inFrontmatter = (s: EditorState): boolean => {
  const r = frontmatterRange(s.doc)
  return r !== null && s.selection.main.head <= r.to
}

/** Contexts where inline markup is literal or would break the syntax. */
const inLiteral = (s: EditorState): boolean =>
  inFrontmatter(s) || fencedCodeActive(s) || mathBlockActive(s)

/**
 * Inside an inline `` `code` `` or `$math$` span, no *other* mark can be added —
 * `` `**x**` `` / `$`x`$` are not valid. The span's own mark stays live so it
 * can be toggled off.
 */
const inOtherInlineLiteral =
  (mark: string) =>
  (s: EditorState): boolean =>
    (mark !== "`" && wrapActive(s, "`")) || (mark !== "$" && wrapActive(s, "$"))

/**
 * Nothing to wrap — a collapsed caret with no word at it (a blank line, a run
 * of spaces, punctuation). Wrapping there just drops an empty `****` / `` `` ``
 * pair, which shows as literal marks in the seamless canvas.
 */
const nothingToWrap = (s: EditorState): boolean =>
  s.selection.main.empty && !s.wordAt(s.selection.main.head)

/** A `disabled` predicate that fires when any of `checks` matches. */
const disabledWhen =
  (...checks: ((s: EditorState) => boolean)[]) =>
  (s: EditorState): boolean =>
    checks.some((c) => c(s))

export interface ToolbarCommand {
  id: ToolbarCommandId
  /** Tooltip and accessible label. */
  title: string
  /** Mutate the document against the live view; returns true when handled. */
  run: (view: EditorView) => boolean
  /** Reflected as the button's pressed state. */
  isActive?: (state: EditorState) => boolean
  /**
   * True when the command can't produce valid Markdown at the current selection
   * — the button is rendered `disabled` and the shortcut is a no-op. Driven by
   * the context predicates above (a table cell, a heading line, a frontmatter /
   * fenced-code / `$$` block).
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
    run: (view) =>
      runInlineInCell(view, (t, f, u) => wrapString(t, f, u, mark)) || toggleWrap(view, mark),
    isActive: (state) => wrapActive(state, mark),
    disabled: disabledWhen(inLiteral, inOtherInlineLiteral(mark), nothingToWrap),
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
    disabled: disabledWhen(tableActive, inLiteral),
    keys: [`Mod-Alt-${level}`],
  }
}

function prefix(
  id: ToolbarCommandId,
  title: string,
  spec: LinePrefixSpec,
  ...extra: ((s: EditorState) => boolean)[]
): ToolbarCommand {
  return {
    id,
    title,
    run: (view) => toggleLinePrefix(view, spec),
    isActive: (state) => linePrefixActive(state, spec.match),
    disabled: disabledWhen(tableActive, inLiteral, ...extra),
  }
}

/** Every built-in command, in a stable order. The toolbar picks from these by id. */
export const BUILTIN_COMMANDS: ToolbarCommand[] = [
  history("undo", "Undo", undo),
  history("redo", "Redo", redo),
  heading(1),
  heading(2),
  heading(3),
  {
    // The explicit "make this a paragraph again" — clearer than clicking the
    // active heading level to toggle it off.
    id: "body" as ToolbarCommandId,
    title: "Body",
    run: (view) => {
      if (!clearHeading(view)) view.focus()
      return true
    },
    isActive: (state) =>
      !/^#{1,6} /.test(state.doc.lineAt(state.selection.main.head).text),
    disabled: disabledWhen(tableActive, inLiteral),
  },
  wrap("bold", "Bold", "**", ["Mod-b"]),
  wrap("italic", "Italic", "*", ["Mod-i"]),
  wrap("strike", "Strikethrough", "~~"),
  wrap("code", "Inline code", "`"),
  {
    // In a table cell a fenced block has no valid Markdown, so degrade to
    // inline `` `code` `` there. Disabled on a heading / in frontmatter / in a
    // `$$` block; inside a fence it is the unwrap toggle, so stays live.
    id: "codeBlock",
    title: "Code block",
    run: (view) =>
      runInlineInCell(view, (t, f, u) => wrapString(t, f, u, "`")) ||
      (tableActive(view.state) ? toggleWrap(view, "`") : toggleFencedCode(view)),
    isActive: (state) => (tableActive(state) ? wrapActive(state, "`") : fencedCodeActive(state)),
    disabled: disabledWhen(inFrontmatter, mathBlockActive, inHeading),
  },
  {
    id: "link",
    title: "Link",
    run: (view) => runInlineInCell(view, linkString) || toggleLink(view),
    isActive: linkActive,
    disabled: inLiteral,
    keys: ["Mod-k"],
  },
  {
    id: "wikilink",
    title: "Wikilink",
    run: (view) => runInlineInCell(view, wikiLinkString) || toggleWikiLink(view),
    isActive: wikiLinkActive,
    disabled: inLiteral,
    keys: ["Mod-Shift-k"],
  },
  prefix("quote", "Blockquote", QUOTE),
  prefix("bulletList", "Bulleted list", BULLET, inHeading),
  prefix("orderedList", "Numbered list", ORDERED, inHeading),
  prefix("task", "Task list", TASK, inHeading),
  {
    id: "hr",
    title: "Divider",
    run: toggleHorizontalRule,
    isActive: horizontalRuleActive,
    disabled: disabledWhen(tableActive, inLiteral),
  },
  {
    id: "frontmatter",
    title: "Frontmatter",
    run: toggleFrontmatter,
    isActive: frontmatterActive,
    // live inside the block itself (to toggle it off), disabled where it makes no sense
    disabled: disabledWhen(tableActive, fencedCodeActive, mathBlockActive, inHeading),
  },
  {
    id: "table",
    title: "Table",
    run: insertTable,
    isActive: tableActive,
    disabled: disabledWhen(
      tableActive,
      inFrontmatter,
      fencedCodeActive,
      mathBlockActive,
      inHeading,
    ),
  },
  wrap("math", "Inline math", "$"),
  {
    // In a table cell, degrade the `$$` block to inline `$…$` math. Disabled on
    // a heading / in frontmatter / in a fence; inside `$$` it is the unwrap
    // toggle, so stays live.
    id: "mathBlock",
    title: "Block math",
    run: (view) =>
      runInlineInCell(view, (t, f, u) => wrapString(t, f, u, "$")) ||
      (tableActive(view.state) ? toggleWrap(view, "$") : toggleMathBlock(view)),
    isActive: (state) => (tableActive(state) ? wrapActive(state, "$") : mathBlockActive(state)),
    disabled: disabledWhen(inFrontmatter, fencedCodeActive, inHeading),
  },
]

export const BUILTIN_BY_ID: Record<string, ToolbarCommand> = Object.fromEntries(
  BUILTIN_COMMANDS.map((c) => [c.id, c]),
)
