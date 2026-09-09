import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete"
import { markdownLanguage } from "@codemirror/lang-markdown"
import type { Extension } from "@codemirror/state"
import type { WikiLinkCompletion, WikiLinkSource } from "../types"

/**
 * `[[` then the target typed so far — no `]`, `|`, or newline. Anchored at the
 * caret by `matchBefore`, so it only matches an unclosed `[[…`.
 */
const OPEN = /\[\[([^[\]\n|]*)$/

/** `[[target]]`, or `[[target|label]]` when the candidate carries a distinct label. */
function toOption(c: WikiLinkCompletion): Completion {
  const alias = c.label && c.label !== c.target ? c.label : undefined
  const insert = alias ? `${c.target}|${alias}` : c.target
  return {
    label: c.label ?? c.target,
    apply: (view, _c, from, to) => {
      const closed = view.state.sliceDoc(to, to + 2) === "]]"
      view.dispatch({
        changes: { from, to, insert: closed ? insert : `${insert}]]` },
        selection: { anchor: from + insert.length + 2 },
        userEvent: "input.complete",
      })
    },
  }
}

/**
 * The completion source. Exposed for unit tests; consumers use
 * `wikilinkCompletion`.
 */
export function wikilinkCompletionSource(source: WikiLinkSource) {
  return async (ctx: CompletionContext): Promise<CompletionResult | null> => {
    const open = ctx.matchBefore(OPEN)
    if (!open) return null
    // `[[` with nothing typed yet: wait for a keystroke (or an explicit trigger)
    // rather than firing on the bracket itself.
    if (open.from + 2 === ctx.pos && !ctx.explicit) return null

    const options = (await source(open.text.slice(2))).map(toOption)
    if (!options.length) return null
    return {
      from: open.from + 2,
      to: ctx.pos,
      options,
      // The host has already searched and ordered its index; don't re-filter.
      filter: false,
    }
  }
}

/**
 * `[[wikilink]]` autocomplete. Off unless the host passes `wikiLinkSource`.
 * Registered through the Markdown language data, so it is inert inside a fenced
 * code block and leaves any embedded-language completions intact.
 */
export function wikilinkCompletion(source?: WikiLinkSource): Extension {
  if (!source) return []
  return [
    autocompletion(),
    markdownLanguage.data.of({ autocomplete: wikilinkCompletionSource(source) }),
  ]
}
