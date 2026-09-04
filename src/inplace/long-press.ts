/**
 * Touch / pen long-press detection.
 *
 * A mouse gets the context menu from the native `contextmenu` event on
 * right-click. A touch device has no dependable equivalent — iOS Safari in
 * particular races its own selection callout on a long-press and usually wins,
 * so `contextmenu` never arrives. This runs a plain timer instead: pointer
 * down, hold still for `delay` ms, and `onLongPress` fires with the contact
 * point.
 *
 * Mouse pointers are ignored — they already have `contextmenu`. Moving past
 * `slop` pixels, or lifting / cancelling before the timer, aborts the press.
 * `cancel()` aborts a pending press without detaching — the caller uses it when
 * a real `contextmenu` lands first (Android synthesises one from the same
 * gesture) so the two paths can't both open the menu.
 */

export interface LongPressOptions {
  /** Hold time before the press completes. Default 500 ms. */
  delay?: number
  /** Movement (from the contact point, on either axis) that aborts it. Default 10 px. */
  slop?: number
  /** Fired when the hold completes: viewport coordinates and the element the
   *  finger first landed on. */
  onLongPress: (x: number, y: number, target: EventTarget | null) => void
}

export interface LongPressHandle {
  /** Abort a press in progress; keeps the listeners attached. */
  cancel: () => void
  /** Abort and detach every listener. */
  dispose: () => void
}

/** Attach long-press detection to `el`. */
export function attachLongPress(el: HTMLElement, opts: LongPressOptions): LongPressHandle {
  const delay = opts.delay ?? 500
  const slop = opts.slop ?? 10
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0

  const cancel = () => {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return
    cancel()
    startX = e.clientX
    startY = e.clientY
    const target = e.target
    timer = setTimeout(() => {
      timer = null
      opts.onLongPress(startX, startY, target)
    }, delay)
  }

  const onMove = (e: PointerEvent) => {
    if (timer == null) return
    if (Math.abs(e.clientX - startX) > slop || Math.abs(e.clientY - startY) > slop) cancel()
  }

  el.addEventListener("pointerdown", onDown)
  el.addEventListener("pointermove", onMove)
  el.addEventListener("pointerup", cancel)
  el.addEventListener("pointercancel", cancel)

  return {
    cancel,
    dispose: () => {
      cancel()
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", cancel)
      el.removeEventListener("pointercancel", cancel)
    },
  }
}
