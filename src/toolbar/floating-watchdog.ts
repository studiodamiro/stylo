import { useEffect, type RefObject } from "react"

/**
 * Continuously re-asserts a `transform` on a `position: fixed` element,
 * alternating an imperceptible sub-pixel jitter every animation frame,
 * instead of trusting the browser to keep it correctly composited on its
 * own. Several rounds of on-device testing found iOS Safari losing track of
 * this exact kind of element — across its own address-bar animation, and in
 * at least one report tied to the keyboard opening — in ways a one-time
 * static fix (a plain `translateZ(0)`) did not reliably prevent. A value
 * that never changes gives the browser nothing to recompute; alternating it
 * every frame forces a fresh compositor pass regardless of what triggered
 * the drift, so it can't stay wrong for more than one frame (~16ms).
 *
 * Writes to the DOM directly rather than through React state, so this never
 * causes a re-render — the transform is the only thing touched.
 */
export function useFloatingWatchdog(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let jitter = false
    const tick = () => {
      const el = ref.current
      if (el) {
        jitter = !jitter
        el.style.transform = jitter ? "translate3d(0, 0.01px, 0)" : "translate3d(0, 0, 0)"
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, enabled])
}
