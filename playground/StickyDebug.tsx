import { useEffect, useRef, useState } from "react"
import { useFloatingWatchdog } from "../src/toolbar/floating-watchdog"

interface Snapshot {
  barY: number
  barH: number
  barPosition: string
  selfY: number
  scrollY: number
  vvHeight: number | null
  vvOffsetTop: number | null
  innerHeight: number
}

function snapshot(selfEl: HTMLElement | null): Snapshot {
  const bar = document.querySelector('[role="toolbar"]')
  const rect = bar?.getBoundingClientRect()
  const cs = bar ? getComputedStyle(bar) : null
  const vv = window.visualViewport
  return {
    barY: rect ? Math.round(rect.y) : NaN,
    barH: rect ? Math.round(rect.height) : NaN,
    barPosition: cs?.position ?? "n/a",
    // This readout's own position — a bare `position: fixed` div with the
    // same rAF watchdog the toolbar uses (see below). If this drifts too,
    // the bug isn't specific to the toolbar's own code.
    selfY: selfEl ? Math.round(selfEl.getBoundingClientRect().y) : NaN,
    scrollY: Math.round(window.scrollY),
    vvHeight: vv ? Math.round(vv.height) : null,
    vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    innerHeight: window.innerHeight,
  }
}

/**
 * Playground-only diagnostic readout for the sticky toolbar — not part of the
 * library. A screenshot alone can't tell "gone from the DOM" apart from
 * "positioned off-screen" apart from "covered by something else"; this puts
 * the bar's actual computed state on screen so the next occurrence gives a
 * real answer instead of another guess. Polls in addition to listening,
 * since some of what moves the bar (CodeMirror's own scroll-into-view, the
 * keyboard opening) doesn't reliably fire a `scroll`/`resize` event in every
 * browser.
 */
export function StickyDebug() {
  const selfRef = useRef<HTMLDivElement>(null)
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(null))
  // The same rAF watchdog the toolbar uses, applied to this readout too — a
  // control group. If this bare fixed div also drifts on scroll, the bug
  // isn't specific to the toolbar; if it holds while the toolbar still
  // doesn't, that points at something toolbar- or render-specific instead.
  useFloatingWatchdog(selfRef, true)

  useEffect(() => {
    const update = () => setSnap(snapshot(selfRef.current))
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    window.visualViewport?.addEventListener("scroll", update)
    const id = setInterval(update, 300)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("scroll", update)
      clearInterval(id)
    }
  }, [])

  return (
    <div
      ref={selfRef}
      style={{
        position: "fixed",
        left: 4,
        top: 4,
        zIndex: 9999,
        padding: "4px 6px",
        background: "rgba(0,0,0,0.75)",
        color: "#0f0",
        fontFamily: "ui-monospace, monospace",
        fontSize: "10px",
        lineHeight: 1.4,
        borderRadius: 4,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {`bar y:${snap.barY} h:${snap.barH} pos:${snap.barPosition} | self y:${snap.selfY}\nscrollY:${snap.scrollY} vvH:${snap.vvHeight} vvTop:${snap.vvOffsetTop} winH:${snap.innerHeight}`}
    </div>
  )
}
