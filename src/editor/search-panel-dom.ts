import type { EditorView } from "@codemirror/view"

/** Class stylo tags its panel root with; CM6 adds its own `cm-panel` alongside it. */
export const PANEL_CLASS = "stylo-search-panel"

/** The panel's elements, in the order they're appended — which is also Tab order. */
export interface SearchDom {
  root: HTMLDivElement
  find: HTMLInputElement
  next: HTMLButtonElement
  prev: HTMLButtonElement
  all: HTMLButtonElement
  replace: HTMLInputElement
  replaceBtn: HTMLButtonElement
  replaceAllBtn: HTMLButtonElement
  caseSensitive: HTMLInputElement
  regexp: HTMLInputElement
  wholeWord: HTMLInputElement
  close: HTMLButtonElement
}

/** Dissociates a field from any host `<form>` it happens to sit inside — same reason
 * `@codemirror/search`'s own panel sets this on every field. */
function detachFromForm(el: HTMLElement) {
  el.setAttribute("form", "")
}

function textField(name: string, placeholder: string, className: string): HTMLInputElement {
  const el = document.createElement("input")
  el.type = "text"
  el.name = name
  el.placeholder = placeholder
  el.setAttribute("aria-label", placeholder)
  el.className = className
  detachFromForm(el)
  return el
}

function actionButton(name: string, label: string): HTMLButtonElement {
  const el = document.createElement("button")
  el.type = "button"
  el.name = name
  el.className = "stylo-search-button"
  el.textContent = label
  return el
}

function optionCheckbox(
  name: string,
  label: string,
): { field: HTMLInputElement; wrap: HTMLLabelElement } {
  const field = document.createElement("input")
  field.type = "checkbox"
  field.name = name
  detachFromForm(field)
  const wrap = document.createElement("label")
  wrap.className = "stylo-search-check"
  wrap.append(field, document.createTextNode(label))
  return { field, wrap }
}

/**
 * Builds the find/replace row in reading order — find, next/prev/all, replace,
 * replace/replace-all, the three checkboxes, close — so Tab order matches the visual
 * layout. `@codemirror/search`'s own panel is fixed markup restyled from outside, which
 * only ever let stylo reorder the *paint*, not the DOM; owning construction removes that
 * ceiling entirely.
 */
export function buildSearchDom(view: EditorView): SearchDom {
  const phrase = (s: string) => view.state.phrase(s)

  const find = textField("search", phrase("Find"), "stylo-search-field")
  find.setAttribute("main-field", "true")
  const next = actionButton("next", phrase("next"))
  const prev = actionButton("prev", phrase("previous"))
  const all = actionButton("select", phrase("all"))
  const replace = textField("replace", phrase("Replace"), "stylo-search-field stylo-search-replace")
  const replaceBtn = actionButton("replace", phrase("replace"))
  const replaceAllBtn = actionButton("replaceAll", phrase("replace all"))
  const caseSensitive = optionCheckbox("case", phrase("match case"))
  const regexp = optionCheckbox("re", phrase("regexp"))
  const wholeWord = optionCheckbox("word", phrase("by word"))
  const close = actionButton("close", "×")
  close.classList.add("stylo-search-close")
  close.setAttribute("aria-label", phrase("close"))

  const root = document.createElement("div")
  root.className = PANEL_CLASS
  root.append(
    find,
    next,
    prev,
    all,
    replace,
    replaceBtn,
    replaceAllBtn,
    caseSensitive.wrap,
    regexp.wrap,
    wholeWord.wrap,
    close,
  )

  return {
    root,
    find,
    next,
    prev,
    all,
    replace,
    replaceBtn,
    replaceAllBtn,
    caseSensitive: caseSensitive.field,
    regexp: regexp.field,
    wholeWord: wholeWord.field,
    close,
  }
}
