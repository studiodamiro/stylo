---
title: "Auto-save"
created: 2026-09-04
type: wiki-guides
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# Auto-save

Stylo has **no `autoSave` prop**, by design. Persistence is a policy — how often
to write, on a timer or on blur, how to reconcile conflicts, what to do offline —
and that belongs to the application, not a text-editing component. CodeMirror,
Monaco, TipTap, and Lexical all take the same line: they expose the change
stream and stop there. Auto-save in VS Code, Notion, and Google Docs lives in the
app layer.

Stylo gives you two hooks to build on:

- **`onChange(value)`** — every edit, synchronously. This is the stream you
  debounce.
- **`onSave(value)`** — `Cmd/Ctrl+S`, and the opt-in [`save` toolbar
  item](../reference/toolbar.md). Wire it to the same "save now" path so a manual
  save and an auto-save share one code path.

## A `useAutosave` hook

Debounced, skips a save when nothing changed since the last one, flushes on tab
hide / navigation / unmount (the case that otherwise loses the last second of
typing), and reports status.

```tsx
import { useEffect, useRef, useState } from "react"

type Status = "idle" | "saving" | "saved" | "error"

export function useAutosave(
  value: string,
  save: (value: string) => void | Promise<void>,
  { delay = 800 }: { delay?: number } = {},
) {
  const [status, setStatus] = useState<Status>("idle")
  const savedValue = useRef(value) // last value persisted
  const latest = useRef(value) // most recent value seen
  latest.current = value
  const saveRef = useRef(save)
  saveRef.current = save

  // One stable flush function for the timer, the event listeners, and `saveNow`.
  const flush = useRef(async () => {
    if (latest.current === savedValue.current) return
    const pending = latest.current
    setStatus("saving")
    try {
      await saveRef.current(pending)
      savedValue.current = pending
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }).current

  // Debounce: restart the timer on every change; save `delay` ms after the
  // last one. No save on mount — `value` still equals `savedValue`.
  useEffect(() => {
    if (value === savedValue.current) return
    const id = setTimeout(flush, delay)
    return () => clearTimeout(id)
  }, [value, delay, flush])

  // Data-loss guard: flush when the tab is hidden, on navigation, and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", flush)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", flush)
      void flush()
    }
  }, [flush])

  return { status, saveNow: flush }
}
```

### Wiring it

```tsx
function Editor() {
  const [doc, setDoc] = useState(initial)
  const { status, saveNow } = useAutosave(doc, (md) => api.put("/note", md))

  return (
    <>
      <Stylo value={doc} onChange={setDoc} onSave={() => saveNow()} />
      <span>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
    </>
  )
}
```

`onSave={() => saveNow()}` makes `Cmd/Ctrl+S` (and the `save` toolbar button)
flush immediately instead of waiting out the debounce.

## Variations

- **Save on blur only.** Drop the timer; call `flush` from the `visibilitychange`
  / `pagehide` listeners plus the editor's blur. Fewer writes, and nothing is
  lost as long as the tab closes cleanly.
- **Fixed interval.** `setInterval(flush, 30_000)` — the Google Docs model.
  Simple, predictable, less responsive.
- **Debounce + interval ceiling.** Debounce for responsiveness, but force a
  flush at least every N seconds so a user who never pauses still gets saved.

## Gotchas

- **Don't feed the debounced value back into `value`.** `value` stays driven by
  `onChange`; the hook only reads it.
- **Handle the async rejection.** A failed save should surface (`status:
"error"`) and ideally retry — never swallow it silently.
- **React StrictMode** mounts effects twice in development; the hook is
  idempotent (the mount flush is a no-op because nothing changed), so this is
  safe, but expect the paired console noise.
