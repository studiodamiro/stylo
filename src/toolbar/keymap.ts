import { Prec } from "@codemirror/state"
import { keymap } from "@codemirror/view"
import { BUILTIN_COMMANDS } from "./commands"

/**
 * Formatting shortcuts (ADR-002 §5): `Mod-b` / `Mod-i` bold and italic,
 * `Mod-k` link, `Mod-Alt-1..3` headings. Bound on every CodeMirror surface
 * whether or not the visible toolbar is mounted. Undo/redo stay with
 * `historyKeymap`, so no command that declares no keys is included here.
 */
export const markdownKeymap = Prec.high(
  keymap.of(
    BUILTIN_COMMANDS.filter((c) => c.keys && c.keys.length > 0).flatMap((c) =>
      c.keys!.map((key) => ({ key, preventDefault: true, run: c.run })),
    ),
  ),
)
