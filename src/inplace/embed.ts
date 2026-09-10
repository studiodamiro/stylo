import { syntaxTree } from "@codemirror/language"
import { type EditorState, type Range, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"
import { EMBED_PATTERN, isLoneEmbed } from "../embed"
import { embedRegistryFacet, inPlaceConfigFacet } from "./config"
import type { EmbedRegistry } from "./embed-registry"
import { revealedLines } from "./reveal"
import { inCodeContext } from "./scan"

/**
 * Inert slot for one lone-line `![[ref]]`. `toDOM` builds an empty `<div>` and
 * registers it with the per-canvas `EmbedRegistry`; `InPlaceView` portals a
 * host `<Embed>` into it. No React, no resolution here — cheap to build and
 * rebuild. `eq` compares `ref`, so CodeMirror keeps the slot across scrolls and
 * selection changes and only rebuilds it when the reference changes. See ADR-009.
 */
class EmbedWidget extends WidgetType {
  private id = -1

  constructor(
    readonly ref: string,
    private readonly registry: EmbedRegistry,
  ) {
    super()
  }

  override eq(other: EmbedWidget) {
    return other.ref === this.ref
  }

  toDOM() {
    const el = document.createElement("div")
    el.className = "cm-inplace-embed"
    this.id = this.registry.allocate()
    el.dataset.styloEmbedSlot = String(this.id)
    this.registry.add({ id: this.id, ref: this.ref, el })
    return el
  }

  override destroy() {
    if (this.id >= 0) this.registry.remove(this.id)
  }

  override ignoreEvent() {
    return false
  }
}

/**
 * Whole-document scan for lone-line `![[ref]]` blocks — the CodeMirror grammar
 * has no embed node, and a lone embed is always a single line, so a state field
 * (not the view plugin) keeps it beside `blockMathField`. Off unless the host
 * set `embedSource` (the registry facet is then non-null) and the `embeds`
 * toggle is on. A line the caret touches is withheld, so the raw `![[ref]]`
 * source shows for editing — the block-math reveal path.
 */
function buildEmbeds(state: EditorState): DecorationSet {
  const registry = state.facet(embedRegistryFacet)
  if (!registry || !state.facet(inPlaceConfigFacet).embeds) return Decoration.none
  if (!state.doc.toString().includes("![[")) return Decoration.none

  const revealed = revealedLines(state)
  const tree = syntaxTree(state)
  const out: Range<Decoration>[] = []

  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n)
    if (!isLoneEmbed(line.text)) continue
    EMBED_PATTERN.lastIndex = 0
    const ref = (EMBED_PATTERN.exec(line.text.trim())?.[1] ?? "").trim()
    if (!ref) continue
    if (inCodeContext(tree, line.from + line.text.indexOf("!["))) continue
    if (revealed.has(n)) continue
    out.push(
      Decoration.replace({ widget: new EmbedWidget(ref, registry), block: true }).range(
        line.from,
        line.to,
      ),
    )
  }

  return Decoration.set(out, true)
}

/**
 * Decorations for the in-place embed slots, plus the atomic ranges that let the
 * caret step over a rendered embed instead of into it.
 */
export const embedField = StateField.define<DecorationSet>({
  create: buildEmbeds,
  update: (value, tr) => (tr.docChanged || tr.selection ? buildEmbeds(tr.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})
