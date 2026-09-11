import { closeSearchPanel, openSearchPanel, searchPanelOpen } from "@codemirror/search"
import { EditorView, ViewPlugin } from "@codemirror/view"

const CLOSING_CLASS = "cm-search-closing"
// Matches the `@keyframes stylo-search-slide-out` duration in `theme.ts`.
const CLOSE_MS = 160

/**
 * Toolbar "search" command: opens the panel (sliding down via the CSS
 * `stylo-search-slide-in` keyframe on mount) or, if it's already open,
 * animates it closed instead of just re-focusing the find field.
 */
export function toggleSearchPanel(view: EditorView): boolean {
  return searchPanelOpen(view.state) ? animatedClose(view) : openSearchPanel(view)
}

function animatedClose(view: EditorView): boolean {
  const panel = view.dom.querySelector(".cm-panel.cm-search")
  if (!panel || panel.classList.contains(CLOSING_CLASS)) return true
  panel.classList.add(CLOSING_CLASS)
  setTimeout(() => {
    if (view.dom.isConnected) closeSearchPanel(view)
  }, CLOSE_MS)
  return true
}

/**
 * `@codemirror/search` removes the panel's DOM synchronously from both its
 * own × button and its `Escape` binding — no lifecycle hook runs beforehand,
 * so there's nothing to animate. This intercepts both in the capture phase on
 * `view.dom` (an ancestor of the panel) before the library's own bubble-phase
 * handlers run, plays the slide-up, then calls the real close.
 */
export const animatedSearchClose = ViewPlugin.define((view) => {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return
    const target = event.target
    if (!(target instanceof Element) || !target.closest(".cm-panel.cm-search")) return
    event.preventDefault()
    event.stopPropagation()
    animatedClose(view)
  }
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (!target.closest(".cm-panel.cm-search button[name='close']")) return
    event.preventDefault()
    event.stopPropagation()
    animatedClose(view)
  }
  view.dom.addEventListener("keydown", onKeydown, { capture: true })
  view.dom.addEventListener("click", onClick, { capture: true })
  return {
    destroy() {
      view.dom.removeEventListener("keydown", onKeydown, { capture: true })
      view.dom.removeEventListener("click", onClick, { capture: true })
    },
  }
})
