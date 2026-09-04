import { useEffect, useRef } from "react"
import { Annotation, Compartment, EditorState, type Extension, Prec } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import type { CodeLanguages } from "../types"
import { baseExtensions, dynamicConfig } from "./extensions"
import { runSave } from "./save"

/** Marks doc changes that came from the `value` prop, so they don't echo back through `onChange`. */
const External = Annotation.define<boolean>()

export interface UseCodeMirrorOptions {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  placeholder?: string
  /** Called with the doc string on `Mod-s`; suppresses the browser dialog when set. */
  onSave?: (value: string) => void
  /** Called with the `EditorView` once it is created, and with `null` on teardown. */
  onViewChange?: (view: EditorView | null) => void
  /**
   * Extra extensions merged in at construction (e.g. the in-place decoration
   * layer). Captured once — pass a stable, module-level array.
   */
  extensions?: Extension[]
  /** Fenced-code grammars, forwarded to the Markdown language. Read once. */
  codeLanguages?: CodeLanguages
}

/**
 * Owns a CodeMirror `EditorView` for the lifetime of the host element and keeps
 * it in sync with a controlled Markdown string. Returns a ref for the container.
 */
export function useCodeMirror({
  value,
  onChange,
  readOnly = false,
  placeholder,
  onSave,
  onViewChange,
  extensions,
  codeLanguages,
}: UseCodeMirrorOptions) {
  const parent = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  // Stable wrapper: the facet holds this, it reads the latest handler. The
  // compartment only reconfigures when the handler's *presence* flips.
  const saveFn = useRef((value: string) => onSaveRef.current?.(value)).current
  const hasSave = onSave != null
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange
  const dynamic = useRef(new Compartment())

  // Create the view once. `value` / `readOnly` / `placeholder` are reconciled by
  // the effects below; constructing here (not during render) keeps this SSR-safe.
  useEffect(() => {
    const el = parent.current
    if (!el) return

    const view = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: value,
        extensions: [
          baseExtensions(codeLanguages),
          dynamic.current.of(
            dynamicConfig({ readOnly, placeholder, save: hasSave ? saveFn : undefined }),
          ),
          Prec.high(keymap.of([{ key: "Mod-s", run: runSave }])),
          ...(extensions ?? []),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            if (update.transactions.some((t) => Boolean(t.annotation(External)))) return
            onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    onViewChangeRef.current?.(view)

    return () => {
      onViewChangeRef.current?.(null)
      view.destroy()
      viewRef.current = null
    }
  }, [])

  // Push external `value` changes into the document without triggering `onChange`.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      annotations: External.of(true),
    })
  }, [value])

  // Reconfigure prop-driven extensions in place.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: dynamic.current.reconfigure(
        dynamicConfig({ readOnly, placeholder, save: hasSave ? saveFn : undefined }),
      ),
    })
  }, [readOnly, placeholder, hasSave, saveFn])

  return parent
}
