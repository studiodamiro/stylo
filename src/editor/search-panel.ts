import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  replaceAll,
  replaceNext,
  SearchQuery,
  searchPanelOpen,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search"
import { type EditorView, type Panel, runScopeHandlers } from "@codemirror/view"
import { buildSearchDom, PANEL_CLASS } from "./search-panel-dom"

const CLOSING_CLASS = "cm-search-closing"
// Matches the `@keyframes stylo-search-slide-out` duration in `theme.ts`.
const CLOSE_MS = 160

/** Toolbar "search" command: opens the panel, or animates it closed if it's already open. */
export function toggleSearchPanel(view: EditorView): boolean {
  return searchPanelOpen(view.state) ? animatedClose(view) : openSearchPanel(view)
}

/** Plays the slide-up transition, then runs the real close once it finishes. Shared by
 * the toolbar's search button and the panel's own close button / Escape handler below —
 * both just need "close this view's panel," not a reference to a particular instance. */
function animatedClose(view: EditorView): boolean {
  const panel = view.dom.querySelector(`.${PANEL_CLASS}`)
  if (!panel || panel.classList.contains(CLOSING_CLASS)) return true
  panel.classList.add(CLOSING_CLASS)
  setTimeout(() => {
    if (view.dom.isConnected) closeSearchPanel(view)
  }, CLOSE_MS)
  return true
}

/**
 * Stylo's replacement for `@codemirror/search`'s default panel, built through the
 * `search()` extension's `createPanel` hook instead of restyling the library's fixed
 * markup with CSS `order` (the previous approach — see the 0.10.0 journal entry). Owning
 * the DOM means the row is already built in reading order, so Tab now follows the same
 * left-to-right layout that's on screen, and the close animation is a plain listener on
 * our own button instead of a capture-phase interception of the library's.
 */
export function createStyloSearchPanel(view: EditorView): Panel {
  const dom = buildSearchDom(view)
  let query = getSearchQuery(view.state)
  syncFields(query)

  function syncFields(q: SearchQuery) {
    dom.find.value = q.search
    dom.replace.value = q.replace
    dom.caseSensitive.checked = q.caseSensitive
    dom.regexp.checked = q.regexp
    dom.wholeWord.checked = q.wholeWord
  }

  function commit() {
    const next = new SearchQuery({
      search: dom.find.value,
      caseSensitive: dom.caseSensitive.checked,
      regexp: dom.regexp.checked,
      wholeWord: dom.wholeWord.checked,
      replace: dom.replace.value,
    })
    if (next.eq(query)) return
    query = next
    view.dispatch({ effects: setSearchQuery.of(query) })
  }

  for (const field of [dom.find, dom.replace, dom.caseSensitive, dom.regexp, dom.wholeWord]) {
    field.addEventListener("input", commit)
    field.addEventListener("change", commit)
  }

  dom.root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      animatedClose(view)
      return
    }
    // Carries in-panel shortcuts (F3 / Mod-g next & previous, Mod-d, …) from
    // `searchKeymap` — needed because these fields sit outside `contentDOM`, so the
    // editor's own keymap handling never sees keydowns that land here.
    if (runScopeHandlers(view, event, "search-panel")) {
      event.preventDefault()
      return
    }
    if (event.key !== "Enter") return
    event.preventDefault()
    if (event.target === dom.find) (event.shiftKey ? findPrevious : findNext)(view)
    else if (event.target === dom.replace) replaceNext(view)
  })

  dom.next.addEventListener("click", () => findNext(view))
  dom.prev.addEventListener("click", () => findPrevious(view))
  dom.all.addEventListener("click", () => selectMatches(view))
  dom.replaceBtn.addEventListener("click", () => replaceNext(view))
  dom.replaceAllBtn.addEventListener("click", () => replaceAll(view))
  dom.close.addEventListener("click", () => animatedClose(view))

  return {
    dom: dom.root,
    top: true,
    update(update) {
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(setSearchQuery) && !effect.value.eq(query)) {
            query = effect.value
            syncFields(query)
          }
        }
      }
    },
  }
}
