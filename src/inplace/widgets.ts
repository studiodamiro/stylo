import { type EditorView, WidgetType } from "@codemirror/view"

/** Rendered `<hr>` replacing a `---` / `***` / `___` line. */
export class HrWidget extends WidgetType {
  override eq() {
    return true
  }

  toDOM() {
    const el = document.createElement("hr")
    el.className = "cm-inplace-hr"
    return el
  }
}

/** `•` glyph replacing a `-` / `*` / `+` list marker. */
export class BulletWidget extends WidgetType {
  override eq() {
    return true
  }

  toDOM() {
    const el = document.createElement("span")
    el.className = "cm-inplace-bullet"
    el.textContent = "•"
    return el
  }

  override ignoreEvent() {
    return false
  }
}

/**
 * Interactive checkbox replacing a `[ ]` / `[x]` task marker. Toggling it
 * dispatches a one-character change to the source (`" "` ⇄ `"x"`).
 */
export class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super()
  }

  override eq(other: CheckboxWidget) {
    return other.checked === this.checked
  }

  toDOM(view: EditorView) {
    const input = document.createElement("input")
    input.type = "checkbox"
    input.checked = this.checked
    input.className = "cm-inplace-checkbox"
    input.addEventListener("mousedown", (event) => event.stopPropagation())
    input.addEventListener("change", () => {
      const at = view.posAtDOM(input) + 1 // the char between the brackets
      view.dispatch({ changes: { from: at, to: at + 1, insert: this.checked ? " " : "x" } })
    })
    return input
  }

  override ignoreEvent() {
    return true
  }
}
