import { Facet } from "@codemirror/state"
import type { InPlaceConfig, InPlaceDecorationToggles, TableEditing } from "../types"

/** `InPlaceDecorationToggles` with every key resolved to a concrete boolean. */
export type ResolvedToggles = Required<InPlaceDecorationToggles>

const DEFAULT_TOGGLES: ResolvedToggles = {
  headings: true,
  emphasis: true,
  links: true,
  wikilinks: true,
  math: true,
  lists: true,
  tasks: true,
  blockquote: true,
  horizontalRule: true,
  code: true,
  frontmatter: true,
  tables: true,
}

export function resolveToggles(config?: InPlaceConfig): ResolvedToggles {
  return { ...DEFAULT_TOGGLES, ...config?.decorations }
}

/**
 * Carries the resolved decoration toggles to every producer (the view plugin
 * and the three state fields). Seeded once by `inPlaceExtension`; read, never
 * written, by `decorate.ts`, `math.ts`, `frontmatter.ts`, and `tables.ts`.
 */
export const inPlaceConfigFacet = Facet.define<ResolvedToggles, ResolvedToggles>({
  combine: (values) => values[0] ?? DEFAULT_TOGGLES,
})

/** Table editing mode, seeded once by `inPlaceExtension`; read by `tables.ts`. */
export const tableEditingFacet = Facet.define<TableEditing, TableEditing>({
  combine: (values) => values[0] ?? "source",
})

/**
 * Whether the right-click menu takes over from the browser's own context menu
 * in the canvas. Seeded once by `inPlaceExtension`; read by `menu-plugin.ts`.
 */
export const contextMenuEnabled = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? true,
})

/**
 * Whether the floating inline-formatting bar follows a selection. Seeded once by
 * `inPlaceExtension`; read by `selection-bar.ts`.
 */
export const selectionBarEnabled = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? true,
})
