import type { Panel } from "@codemirror/view"

/** Class the panel root carries; CM6 adds its own `cm-panel` alongside it. */
export const PANEL_CLASS = "stylo-canvas-header"

/**
 * Bridges `StyloProps.canvasHeader` (imperative CodeMirror DOM) to host React.
 * `panel` is handed to `showPanel.of(...)` as the panel constructor CM6 calls
 * once per view; the view's surface component subscribes and portals the
 * host's render output into the resulting node. One instance per surface,
 * created where the extension is built — never module-global, so two editors
 * on a page do not share a slot.
 *
 * Docked as a second top panel, ordered after the search panel wherever it's
 * installed (see `SourceView.tsx` / `InPlaceView.tsx`) so it sits between
 * find/replace and the document body — never a sibling of anything a host
 * renders via `toolbar.render`, which sits *before* the whole canvas.
 */
export class CanvasHeaderHost {
  private dom: HTMLElement | null = null
  private listeners = new Set<() => void>()

  panel = (): Panel => {
    const dom = document.createElement("div")
    dom.className = PANEL_CLASS
    this.dom = dom
    this.notify()
    return {
      dom,
      top: true,
      destroy: () => {
        this.dom = null
        this.notify()
      },
    }
  }

  /** `useSyncExternalStore` subscribe. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** `useSyncExternalStore` snapshot — stable between `panel()` / `destroy()` calls. */
  getSnapshot = (): HTMLElement | null => this.dom

  private notify() {
    for (const listener of this.listeners) listener()
  }
}
