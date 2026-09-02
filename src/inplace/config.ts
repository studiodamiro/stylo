import { Facet } from "@codemirror/state"
import type {
  InPlaceConfig,
  InPlaceDecorationToggles,
  RevealMode,
  SelectionUI,
  TableEditing,
} from "../types"

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
 * Marker reveal behaviour (ADR-007). `"never"` makes `decorate.ts` hide every
 * inline marker regardless of the caret line. Seeded once by `inPlaceExtension`.
 */
export const revealModeFacet = Facet.define<RevealMode, RevealMode>({
  combine: (values) => values[0] ?? "caret",
})

/**
 * The host's `onLinkClick` (the "Open link" action in the right-click link
 * editor), or `null`. Seeded once by `inPlaceExtension`.
 */
export const linkOpenFacet = Facet.define<((href: string) => void) | null, ((href: string) => void) | null>({
  combine: (values) => values[0] ?? null,
})

/**
 * Whether the right-click menu takes over from the browser's own context menu
 * in the canvas. Seeded once by `inPlaceExtension`; read by `menu-plugin.ts`.
 */
export const contextMenuEnabled = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? true,
})

/**
 * What a non-empty selection offers (ADR-007). `"bar"` shows the floating
 * formatting bar; `"menu"` (default) keeps the inline group in the right-click
 * menu instead; `"none"` shows neither. Seeded once by `inPlaceExtension`; read
 * by `selection-bar.ts` and `context-menu-actions.ts`.
 */
export const selectionUIFacet = Facet.define<SelectionUI, SelectionUI>({
  combine: (values) => values[0] ?? "menu",
})
