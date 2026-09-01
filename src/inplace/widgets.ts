import { WidgetType } from "@codemirror/view"

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
