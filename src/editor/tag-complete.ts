import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete"
import { markdownLanguage } from "@codemirror/lang-markdown"
import type { Extension } from "@codemirror/state"
import type { ResolveErrorInfo, TagCompletion, TagSource } from "../types"

type OnResolveError = (error: unknown, info: ResolveErrorInfo) => void

/**
 * `#` then the tag typed so far — no whitespace or a second `#`. Anchored at the
 * caret by `matchBefore`, and the lookbehind requires start-of-line or a
 * preceding space, so a mid-word `#` (a URL fragment, `word#word`) never
 * matches. A real ATX heading (`# Title`) never matches either: the space right
 * after `#` breaks the query before any of this runs.
 */
const OPEN = /(?<=^|\s)#[^\s#]*$/

/** `tag`, replacing the query typed after `#`. */
function toOption(c: TagCompletion): Completion {
  return {
    label: c.tag,
    apply: (view, _c, from, to) => {
      view.dispatch({
        changes: { from, to, insert: c.tag },
        selection: { anchor: from + c.tag.length },
        userEvent: "input.complete",
      })
    },
  }
}

/**
 * The completion source. Exposed for unit tests; consumers use `tagCompletion`.
 */
export function tagCompletionSource(source: TagSource, onError?: OnResolveError) {
  return async (ctx: CompletionContext): Promise<CompletionResult | null> => {
    const open = ctx.matchBefore(OPEN)
    if (!open) return null
    // Bare `#`: wait for a keystroke (or an explicit trigger) rather than firing
    // on the trigger character itself.
    if (open.from + 1 === ctx.pos && !ctx.explicit) return null

    const query = open.text.slice(1)
    // A digit right after `#` reads as an issue/anchor reference (`#1234`), not
    // a tag — leave it alone.
    if (/^\d/.test(query)) return null

    let options
    try {
      options = (await source(query)).map(toOption)
    } catch (error) {
      // A rejected source shows no completions, as before — the callback is the
      // only new behaviour, so a network failure is not silently a blank list.
      onError?.(error, { source: "tagSource", input: query })
      return null
    }
    if (!options.length) return null
    return {
      from: open.from + 1,
      to: ctx.pos,
      options,
      // The host has already searched and ordered its index; don't re-filter.
      filter: false,
    }
  }
}

/**
 * `#tag` autocomplete. Off unless the host passes `tagSource`. Registered
 * through the Markdown language data, so it is inert inside a fenced code
 * block and leaves any embedded-language completions intact.
 */
export function tagCompletion(source?: TagSource, onError?: OnResolveError): Extension {
  if (!source) return []
  return [
    autocompletion(),
    markdownLanguage.data.of({ autocomplete: tagCompletionSource(source, onError) }),
  ]
}
