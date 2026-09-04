import { useEffect, useState } from "react"

/**
 * How far the on-screen keyboard eats into the window, tracked through the
 * `visualViewport` API. 0 when `enabled` is false or the browser has no
 * `visualViewport` (older Safari, SSR, most desktop browsers). A mobile
 * keyboard shrinks the *visual* viewport, not the layout viewport a plain
 * `position: fixed` bottom offset is computed against — this is what lets the
 * sticky toolbar ride up above the keyboard instead of hiding behind it.
 */
export function useKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = typeof window === "undefined" ? null : window.visualViewport
    if (!enabled || !vv) {
      setInset(0)
      return
    }
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [enabled])

  return inset
}
