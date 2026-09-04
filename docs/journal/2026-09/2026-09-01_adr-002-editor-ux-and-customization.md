---
title: "ADR-002 — Editor UX, Customization API, and Design System"
created: 2026-09-01
type: adr
parent: index
tags:
  - stylo/architecture
  - engineering/adr
---

# ADR-002 — Editor UX, Customization API, and Design System

- **Status:** Accepted — amends
  [ADR-001](./2026-09-01_adr-001-editor-architecture.md) by promoting the
  `in-place` inline live-preview canvas to the default view and into
  first-release scope
- **Date:** 2026-09-01
- **Deciders:** damiro, Grace

---

## Context

Following the establishment of Stylo's plain-text architectural foundation in [ADR-001](./2026-09-01_adr-001-editor-architecture.md), requirements were refined for browser-based CMS projects and modern writing workflows. Authors require a friction-free, distraction-free writing experience (Notion-like in-place editing), while developers building CMS interfaces require granular control over toolbar capabilities, styling adoption, keyboard shortcuts, image handling, and optional end-user toolbar personalization.

We needed to resolve:

1. The primary editing UX model (in-place live preview vs. split view).
2. The developer configuration API for toolbars and overflow.
3. The selection interaction model (smart highlight tooltip).
4. The visual settings customizer model (draggable icons with magnetic docking).
5. Styling, theming, and backwards compatibility for npm consumers.
6. The icon system and extensibility.
7. Multi-author state boundaries and auto-save lifecycles.

---

## Decisions

The items below are split into what the **first release** commits to and what is
**deferred**. Every deferred item is additive, leaves the plain-text invariant
untouched, and must not gate v1.

### Accepted for the first release

#### 1. `in-place` canvas is the default view

- Stylo's default `mode` is an in-place editing canvas built on CodeMirror 6 view
  decorations. Math (`$…$`, `$$…$$`) and headings render live in the document.
- Clicking into a decorated element reveals its raw Markdown/LaTeX for editing;
  moving the cursor away re-decorates it.
- The Markdown string stays the canonical source of truth at all times. This is
  the amendment to ADR-001 recorded in the status line above.
- `source`, `preview`, and `split` remain available via `mode`.

  > **Rollout staged by
  > [ADR-004](./2026-09-01_adr-004-in-place-decoration-canvas.md)
  > (2026-09-01):** the decoration architecture and the v1 node set are
  > specified there, and the canvas is built incrementally. The default `mode`
  > stays `source` until every v1 node type is implemented and playground-
  > verified; the flip to `in-place` is the final step. The committed end state
  > — `in-place` as the default — is unchanged.
  >
  > **Completed 2026-09-01:** the in-place canvas milestone shipped and the
  > default `mode` is now `in-place`. See the
  > [build tracker](./2026-09-01_in-place-canvas.md).

#### 2. Declarative developer toolbar API

- The toolbar is configured with a single declarative prop; developers can lock
  it down or extend it:
  ```tsx
  toolbar={{
    left: ["undo", "redo", "|", "heading", "bold", "italic", "link", "image", "math"],
    right: ["saveStatus", "save"],
    headings: ["h1", "h2", "h3"], // or "dropdown" | "all"
    overflow: "wrap",             // "wrap" (multiline) | "collapse" (overflow into "…" menu)
  }}
  ```
- Granular heading lists constrain hierarchy without exposing unused H4–H6.

  > **Amended 2026-09-02 (v1 shape):** the shipped v1 prop is
  > `toolbar={ items: (ToolbarCommandId | "|")[] }` — a **single ordered list**
  > with `"|"` separators, plus `toolbar={false}` to hide the bar and
  > `toolbar` omitted for the full default set. The `left` / `right` docks, the
  > `overflow` mode, the `headings` sub-config, and a `saveStatus` / `save`
  > pair are **deferred**: they are additive and none gates the release. Heading
  > levels ship as discrete `h1` / `h2` / `h3` command ids, so every toolbar
  > entry is uniformly "a command id or a separator". The built-in ids are
  > `undo`, `redo`, `h1`–`h3`, `bold`, `italic`, `strike`, `link`, `bulletList`,
  > `orderedList`, `task`, `quote`, `hr`, `frontmatter`, `table`, `code`,
  > `codeBlock`, `math`, `mathBlock`. Shipped in the
  > [toolbar milestone](./2026-09-02_toolbar.md); `table` also brings a
  > cell-navigation keymap and live pipe alignment
  > ([note](./2026-09-02_table-editing.md)).

  > **Amended 2026-09-04 (extensibility):** the original "lock it down _or
  > extend it_" intent lands. An `items` entry can now be a `ToolbarCustomItem`
  > object instead of a built-in id — a consumer's own `id`, `title`, `icon`,
  > `run(view)`, and optional `isActive` / `disabled` predicates. It is the
  > same contract a built-in command satisfies internally, rendered through the
  > same button path and refreshed on the same selection / key / pointer
  > events. A `toolbar.render` slot (`(bar, { view }) => ReactNode`) wraps or
  > replaces the rendered `<div role="toolbar">`. Every button, built-in and
  > custom, now carries `data-command="<id>"` as a styling and test hook.
  >
  > A built-in `underline` id also ships now. Markdown has no underline, so it
  > writes a raw `<u>…</u>` pair — correct wherever the host renders inline HTML.
  > It is kept out of the default bar (like `save`) so a consumer opts the button
  > in deliberately, but it binds `Mod-u` on every surface like the other inline
  > shortcuts.
  >
  > **Still deferred:** keyboard shortcuts for custom items — built-in `keys`
  > are compiled into CodeMirror's keymap at construction, so a custom binding
  > needs its own keymap; the consumer uses `getView()` for now. Also the
  > `<StyloToolbarSettings />` visual customizer and the `left` / `right` /
  > `overflow` / `headings` sub-configs.

  > **Amended 2026-09-04 (sticky toolbar):** a first touch pass surfaced that
  > the top-docked bar is a real reach on a phone, and that a right-click-only
  > context menu has no touch equivalent (see the
  > [ADR-007 rollout log](./2026-09-03_adr-007-seamless-in-place.md)). Rather
  > than fight the platform, `toolbar` gained a third knob, `sticky?: boolean`
  > (default `false`), that relocates the same bar to the bottom of the
  > **window**, riding above the on-screen keyboard instead of hiding behind
  > it — the pattern Obsidian, iA Writer, and Ulysses use on mobile.
  >
  > It is opt-in, deliberately: fixing to the window rather than to wherever
  > `<Stylo>` sits on the page is correct for a full-screen editor and wrong
  > for a small embedded field, so a host turns it on rather than it firing
  > from a `pointer: coarse` media query. Mechanically, a new
  > `useKeyboardInset` hook reads the `visualViewport` API — the _layout_
  > viewport a plain `position: fixed` bottom offset is computed against does
  > not shrink when a mobile keyboard opens, only the _visual_ one does, which
  > is the whole reason that API exists. `sticky` also drops the bar's wrap
  > behaviour for a single horizontally-scrolling row and grows its buttons to
  > a 40px touch target. The editing surface gets a static bottom padding so
  > the bar's resting height (keyboard closed) doesn't sit over the last line
  > of text.
  >
  > **On-device correction, same day:** a hands-on check found the bar sitting
  > behind the keyboard, not above it. Two fixes:
  >
  > 1. The bar now repositions via `transform: translateY()` off a `bottom: 0`
  >    resting position, rather than animating `bottom` directly — a
  >    `position: fixed` element moved through `bottom` doesn't reliably
  >    repaint in step with the keyboard's open animation on iOS Safari;
  >    `translateY` forces a compositor update on every `visualViewport` event
  >    instead.
  > 2. The real fix lives on the **host's** side: adding
  >    `interactive-widget=resizes-content` to its own viewport meta tag
  >    makes the _layout_ viewport shrink for the keyboard too — Safari's
  >    default, `resizes-visual`, only shrinks the _visual_ one, which is the
  >    gap `useKeyboardInset` exists to paper over. With it set, `bottom: 0`
  >    rides above the keyboard with no JS help at all; `useKeyboardInset`
  >    becomes a fallback rather than the only mechanism. Stylo cannot set
  >    this itself — a library does not rewrite its host page's viewport meta
  >    tag — so it is a documented pairing, not automatic. The playground's
  >    own `index.html` sets it, since that page is Stylo's to control.
  >
  > Verified in Chromium and WebKit with a scripted `visualViewport` resize
  > (headless browsers have no real software keyboard to trigger one
  > organically) — the bar's computed position tracked the shrunk viewport
  > correctly in both.
  >
  > **A second on-device round found a ceiling `useKeyboardInset` cannot fix
  > at all:** with `sticky: "bottom"`, iOS's own input accessory bar (the
  > up/down field-navigation arrows and a Done checkmark, which iOS docks
  > above the keyboard for any focused editable element) rendered _in front
  > of_ the sticky bar — a web page has no API to out-layer native browser
  > chrome, at any `z-index`, because that chrome isn't part of the page's own
  > stacking context. `sticky` therefore gained a second position,
  > `"top"` (`sticky?: boolean | "top" | "bottom"`, `true` an alias for
  > `"bottom"`), which sidesteps the whole problem rather than solving it:
  > nothing ever eats into the top edge of the screen the way a keyboard and
  > its accessory bar eat the bottom, so `"top"` is a plain, static
  > `position: fixed` pinned to `top: 0` — no `visualViewport` involvement, no
  > compositor-timing risk, and no accessory-bar collision — verified pinned
  > through a full-page scroll in Chromium. `"bottom"`'s accessory-bar ceiling
  > is now documented as a known, unfixable-from-the-web limitation of that
  > mode, not a bug to keep chasing.
  >
  > Covered by `keyboard-inset.test.ts` (the hook, with a `visualViewport`
  > stand-in jsdom doesn't provide) and sticky-specific cases in
  > `toolbar.test.tsx`, for both positions.

  > **A third on-device round, same day:** even `"top"` had a real bug — it
  > would disappear while scrolling and not reliably reappear. This is a
  > long-documented iOS Safari quirk: WebKit can lose track of a plain
  > `position: fixed` element across its own address-bar show/hide animation
  > (distinct from the keyboard; this is the browser's own chrome collapsing
  > on scroll). `"bottom"` never showed this because its `translateY()` inline
  > style incidentally already promotes it to its own GPU compositing layer;
  > `"top"` had no transform at all. Fix: `.toolbarStickyTop` now carries a
  > static `transform: translateZ(0)`, the standard mitigation for this class
  > of bug. This is the **third** distinct native-chrome interaction found by
  > hands-on testing in one day (iOS's selection callout racing long-press,
  > the input accessory bar out-layering `"bottom"`, and now this) — a
  > pattern, not a fluke: `position: fixed` pinned to the real window is
  > powerful but sits directly in the path of every quirk a mobile browser's
  > own chrome has, and none of the three could have been caught without a
  > real device. Unlike the first two, this fix has a well-established
  > mechanism (forcing compositing is a widely-documented WebKit workaround)
  > but is still only confirmed by report, not by a device re-test here.
  >
  > **Also added: `stickyVisibility?: "consistent" | "dynamic"`.** `"dynamic"`
  > fades the bar out (`opacity`, `pointer-events: none`, `aria-hidden`) while
  > the editing surface is unfocused — so it doesn't sit over content while
  > scrolling to read rather than edit — and back in on focus. Tracked off the
  > same `contentDOM` focus/blur listeners the toolbar already used to refresh
  > pressed states. Deterministic JS, no native-chrome dependency, and unlike
  > the position work above, verified end-to-end (focus, blur, initial state)
  > without a device-only caveat.
  >
  > **A fourth on-device round: `translateZ(0)` alone was not enough.** The
  > disappearing-on-scroll bug persisted for `"top"` even with visibility left
  > on its default — ruling out the fade as the cause and pointing back at the
  > same underlying WebKit fixed-position bug the compositing fix was meant to
  > close. Rather than keep guessing at which exact WebKit code path was still
  > tripping (compositing promotion is a real fix for the address-bar-collapse
  > variant of this bug, but nested-`overflow: hidden` ancestors are a
  > separately documented trigger for the same failure family, and `.root`
  > carries `overflow: hidden` for its own reasons), the bar is now portalled
  > straight to `document.body` with React's `createPortal` whenever `sticky`
  > is set. This removes the entire ancestor chain — `.root` and anything the
  > host nests `<Stylo>` inside — as a variable, rather than fixing one more
  > property on it; it is the same technique overlay libraries (dialogs,
  > toasts) use for exactly this reason. `translateZ(0)` stays on
  > `.toolbarStickyTop` as a low-cost second layer of defence. This is now the
  > **fourth** distinct native-chrome interaction found by hands-on testing on
  > this one feature — still unconfirmed on the real device, but this fix
  > removes a whole class of cause rather than one instance of it.
  >
  > **The portal itself shipped with a theming regression, caught on the same
  > device pass:** the bar rendered with a transparent background and the
  > `H1`/`H2`/`H3` glyphs fell back to the browser's default serif font. Every
  > `--stylo-*` token is only ever _defined_ on the `.stylo` class (see
  > `tokens.css`); it reaches the toolbar by ordinary CSS inheritance the same
  > way any CSS custom property does, and a portal breaks that chain along
  > with everything else about the DOM position. The base `.toolbar` also
  > never sets its own `font-family` at all — it has always leaned on
  > inheriting whatever font the host's page sets wherever `<Stylo>` happens
  > to be mounted, which stopped being where the bar was drawn. Fixed by
  > wrapping the portalled content in a plain `<div className="stylo">` (the
  > bare token-defining class, none of `.root`'s box model) so the custom
  > properties resolve again, and giving `.toolbarSticky` its own explicit
  > system-font stack rather than a second inheritance path that could break
  > the same way. The lesson generalises: portalling a themed element to
  > `document.body` doesn't just escape unwanted ancestors, it also escapes
  > every wanted one — anything the component was relying on inheriting has to
  > be re-declared at the new mount point.
  >
  > **A fifth on-device round: the bug outlived the portal too.** With
  > theming restored, `"top"` still disappeared and failed to reliably
  > reappear on scroll — the same symptom after two independent, well-
  > documented mitigations (compositing promotion, then removing the ancestor
  > chain entirely) had already been applied. At that point the diagnosis
  > shifted from "which WebKit code path is still tripping" to "the mechanism
  > itself is the wrong bet": `position: fixed` window-pinning works by
  > fighting the browser's own chrome — the address bar, its own compositing
  > timing — and every one of the four prior on-device findings on this
  > feature was exactly that fight going wrong in a different way. `"top"` is
  > rebuilt on real `position: sticky` instead, which never leaves normal
  > page flow and has nothing to do with browser chrome at all — the same
  > mechanism virtually every reliable sticky header on the web already uses.
  > `translateZ(0)` and the `document.body` portal both come off; neither
  > applies to `sticky`.
  >
  > The one piece that does carry over: `.root`'s `overflow: hidden`
  > (rounded-corner clipping) has to relax to `visible` specifically when
  > `sticky: "top"` is active. A non-`visible` `overflow` on the sticky
  > element's own parent makes browsers treat that parent as the sticky
  > boundary instead of the real page — confirmed against this exact `.root`
  > earlier in this same rollout, and a well-known cross-browser gotcha, worse
  > on Safari specifically. `"bottom"` needed none of this: it was never the
  > one disappearing, and `sticky` can't ride a keyboard opening anyway
  > (nothing about that is a "scroll"), so it stays plain `position: fixed`,
  > un-portalled.
  >
  > Verified this time in **both** Chromium and real WebKit via Playwright —
  > `position: sticky`, pinned at `y: 0` through a deep scroll, back to its
  > natural in-flow position on scroll-back, `.root`'s `overflow: visible`
  > confirmed applied, in both engines. This carries more weight than the
  > earlier "verified in Chromium" notes on this feature: every prior bug was
  > iOS's own OS-level chrome-collapse animation, which no engine test can
  > reproduce regardless of which engine; sticky positioning is pure CSS
  > engine logic, which Playwright's WebKit build faithfully shares with an
  > iPhone's. Still an on-device confirmation from the user, not a substitute
  > for one — but a materially stronger signal than the four attempts before
  > it.
  >
  > One real trade-off, documented rather than hidden: `sticky` only tracks
  > scrolling of an ancestor it shares with the content underneath it. The
  > toolbar sits beside `.source`/`.inplace`, not inside their own scrolling
  > pane, so if a host gives `<Stylo>` a bounded height (its content scrolls
  > internally rather than the whole page), `"top"` will not follow that
  > internal scroll — `"bottom"`, or the host's own header, fits that layout
  > instead. The rollout's actual use case, and every screenshot it was
  > diagnosed from, is the whole page scrolling, which this fixes correctly.
  >
  > **A sixth on-device round: `sticky` outlived the portal, and disappeared
  > for a third trigger.** The two screenshots that surfaced it were telling:
  > one, scrolled deep into the document with no keyboard open, showed the
  > bar correctly pinned — `sticky` genuinely fixed the plain-scroll case. The
  > other, taken moments after tapping into a heading near the top of the
  > document to edit it (keyboard open, caret mid-word), showed no bar at
  > all. A scripted reproduction of a keyboard-style viewport shrink — the
  > exact resize `interactive-widget=resizes-content` causes — held up fine
  > in both Chromium and real WebKit on an already-stuck bar, so it isn't
  > simply "any resize breaks `sticky`"; the likelier culprit is CodeMirror's
  > own scroll-into-view (which repositions the page to keep a newly-placed
  > caret visible) landing at the same moment as the keyboard's resize, in a
  > combination no engine harness can reproduce without a real keyboard.
  >
  > At three triggers deep (plain scroll, then the keyboard, on two different
  > CSS mechanisms), the pattern across this whole rollout is that **any
  > technique which asks the browser to remember a position across an event
  > it didn't directly cause** — `fixed` across the address bar's own
  > animation, `sticky` across a resize plus a script-driven scroll — is
  > where these bugs live. So `"top"` moves off both `fixed` and `sticky`
  > bookkeeping and onto a `requestAnimationFrame` loop
  > (`useFloatingWatchdog`) that re-asserts the bar's `transform` on every
  > frame, alternating an imperceptible `0.01px` jitter so the value always
  > counts as "changed" and the compositor always has something to
  > recompute — a stale, wrong position can't survive more than one frame
  > (~16ms) before self-correcting, regardless of what caused the drift.
  > `position: fixed` comes back as the CSS base (no longer waiting for a
  > scroll threshold the way `sticky` did — the bar is always visually
  > pinned from the first frame), and `.root`'s `overflow: hidden` no longer
  > needs relaxing, since `fixed` never had an issue with it in the first
  > place — only `sticky` did.
  >
  > Verified the same way as the `sticky` round: Chromium and real WebKit via
  > Playwright, transform genuinely alternating frame to frame, position held
  > at `y: 0` through both a deep scroll and a simulated keyboard resize. The
  > same honest caveat applies as before — this proves the mechanism does
  > what it's designed to do, not that it survives the exact combination of
  > real touch input, a real keyboard, and CodeMirror's own scroll-into-view
  > on the user's actual phone, which no harness available here can
  > reproduce. A playground-only diagnostic overlay (`StickyDebug`, not part
  > of the library) now shows the bar's live position and viewport numbers
  > in a corner readout, so the next occurrence — if there is one — gives a
  > real answer instead of another screenshot to pattern-match from.

#### 3. Styling: CSS Modules + a small custom-property token set

- Internal UI (toolbar, menus, drawer) is styled with **CSS Modules**, compiled
  by the library build into a single static `dist/styles.css`. No Tailwind, no
  utility-class toolchain, no PostCSS plugin stack beyond what the bundler needs.
- Consumers import `@damiro/stylo/styles.css` once. It is framework-agnostic — plain CSS,
  Next.js, Astro, Vite, or any Tailwind version — because it ships as compiled
  CSS with locally-scoped class names that cannot collide with host styles.
- A **minimal** token set is exposed as CSS custom properties, covering only what
  the editor chrome needs:
  `--stylo-bg`, `--stylo-text`, `--stylo-text-muted`, `--stylo-border`,
  `--stylo-accent`, `--stylo-ring`, `--stylo-radius`.
  Values are plain (`--stylo-bg: #fff`), not HSL channel triplets, so a host sets
  them directly. Defaults follow shadcn/ui's neutral conventions — 4px spacing
  rhythm, `0.5rem` radius, 1px hairline borders, a visible focus ring, zinc/slate
  greys — as a **visual reference only**. No shadcn or Tailwind code is vendored.
- `peerDependencies`: React `>= 18.0.0` (React 19 included).

  > **Amended 2026-09-02:** an eighth token, **`--stylo-link`** (default
  > `#2563eb`), was added. `--stylo-accent` defaults to near-black (`#18181b`),
  > one shade off body text, so it cannot also carry links once they are styled
  > by colour rather than underline. `--stylo-link` colours links and
  > `[[wikilinks]]` in both `preview` and the in-place canvas, with no
  > underline; `--stylo-accent` now means active / pressed states only. The
  > "held to seven" line below is superseded — the set is eight, and the bar
  > against growth still stands (one token per real role, no shadcn-style
  > sprawl).
  >
  > **Amended 2026-09-02 (typography):** the rendered-content vertical rhythm
  > (`.preview` and the in-place theme) takes **Tailwind's `prose`
  > (`@tailwindcss/typography`) as a second visual reference** alongside
  > shadcn — its `em`-based `line-height` / margin scale only, no plugin
  > bundled, same terms as the shadcn reference. Divergences (tighter `hr`, no
  > `max-width`, no `code` backticks, colour-only links, non-italic
  > blockquotes) and the full scale are in the
  > [typography note](./2026-09-02_typography-rhythm.md).
  >
  > **Amended 2026-09-04 (dark palette):** the token set now ships **dark values
  > as well as light**. `tokens.css` keeps the light block on `.stylo` and adds
  > a dark block that redefines every colour token, triggered by a `.dark` or
  > `[data-theme="dark"]` ancestor — or the same marker on `.stylo` itself — the
  > convention `next-themes` / shadcn drive. Stylo does **not** switch on
  > `prefers-color-scheme`; a consumer's theme layer toggles the class, exactly
  > as shadcn components behave. The dark selector is wrapped in `:where(...)` so
  > its specificity stays equal to a bare `.stylo`, leaving host overrides on
  > `.stylo` to win. `color-scheme` is set on both blocks. New rule: a colour
  > token is not complete until it has a value in **both** blocks — a
  > light-only token is a silent dark-mode regression. See the
  > [save / handle / dark-mode note](./2026-09-04_save-imperative-handle-dark-mode.md).

#### 4. Icons: inline SVG, no icon dependency

- The ~12 built-in toolbar glyphs ship as inline SVG paths inside the component.
  There is no `lucide-react` — or any icon package — in the dependency tree.
- Every icon is replaceable via the `icons` prop (Lucide, Tabler, Heroicons,
  Radix, or custom SVG components).

#### 5. Keyboard shortcuts

- `Cmd/Ctrl+B` bold, `Cmd/Ctrl+I` italic, `Cmd/Ctrl+K` link, `Cmd/Ctrl+S` save,
  `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` undo/redo, `Cmd/Ctrl+Alt+1/2/3` headings.

  > **Amended 2026-09-04 (save wired):** `Cmd/Ctrl+S` is now bound. It calls the
  > new **`onSave(value)`** prop with the full document and suppresses the
  > browser's save dialog; with no `onSave` given, the key keeps its default
  > browser behaviour. Stylo holds **no dirty state** — `value` is the
  > consumer's, so `dirty = value !== lastSaved` is theirs to derive. The
  > keymap lives once in `useCodeMirror`, so it covers `source`, `in-place`, and
  > `split`.
  >
  > A **`save` toolbar command id** also ships (glyph + `BUILTIN_COMMANDS`
  > entry), running the same path. It is **opt-in** — not in
  > `DEFAULT_TOOLBAR_ITEMS` — and renders disabled until `onSave` is wired, so
  > every consumer's bar is not stuck with a greyed button. The **status pill**
  > (`saveStatus`) and the debounced **`autoSave`** hook stay deferred; the
  > auto-save pattern is written up as a
  > [wiki guide](../../wiki/guides/autosave.md) instead of a prop.

#### 6. Imperative handle on a `ref`

> **Added 2026-09-04 (post-v1, additive).** Not in the original ADR; recorded
> here because it is part of the same consumer-integration surface.

- `<Stylo>` forwards a `ref` exposing a small imperative handle, `StyloHandle`:
  - `focus()` — move keyboard focus into the editing surface.
  - `scrollToHeading(text)` — put the caret at the first ATX heading whose text
    matches `text` (trimmed, case-insensitive) and scroll it to the top; returns
    whether one matched. Backs "open note X, scroll to heading Y" navigation.
  - `insertAtCursor(md)` — replace the selection, or insert at the caret.
  - `getView()` — the underlying CodeMirror `EditorView`. An escape hatch,
    explicitly **not** covered by semver; every other method is.
- Every method is inert in `preview` mode (no editor): no-ops, `null`, `false`.
- This supersedes exposing the internal `onViewChange` callback as a prop — the
  handle is the single, typed seam. See the
  [save / handle / dark-mode note](./2026-09-04_save-imperative-handle-dark-mode.md).

### Deferred (post-v1, additive)

- **`<StyloToolbarSettings />` visual customizer** — drag tools between an
  "Available" drawer and "Left"/"Right" magnetic docks; persist to `localStorage`
  or hand out via `onSettingsChange`. Requires an accessible keyboard fallback.
- **Context-aware selection tooltip** (`mode="tooltip" | "toolbar" | "both"`) — a
  floating bubble menu that inspects the CodeMirror Lezer node under the
  selection to show context-relevant actions (plain text vs. link vs. math) and
  active-toggle state.

  > **Amended 2026-09-03 (pulled forward):** the in-place canvas now has a
  > floating **selection bar** (inline marks only, follows a non-empty
  > selection) and a **right-click menu** (inline actions on a selection, block
  >
  > - `Insert` actions otherwise; table cells keep their structural menu). Both
  >   render from `BUILTIN_COMMANDS`, so each entry's `disabled` / `isActive`
  >   drives what is shown — the "inspects the node under the selection" intent,
  >   met through the command predicates rather than a separate Lezer walk.
  >   Toggled by `inPlace.contextMenu` / `inPlace.selectionBar` (both default
  >   `true`); the `mode` enum above was not adopted. See the
  >   [right-click menu and selection bar note](./2026-09-03_context-menu-and-selection-bar.md).
  >   The `<StyloToolbarSettings />` customizer and the docks stay deferred.

- **Debounced auto-save hook** — `autoSave={{ enabled, intervalMs, onAutoSave }}`.
  Still deferred as of 2026-09-04: manual save (`onSave` + `Cmd/Ctrl+S` + the
  opt-in `save` toolbar id, §5) now ships, but a Stylo-owned debounce timer does
  not. The pattern — a `useAutosave` hook over `onChange`, flushed on tab hide —
  is documented as a [wiki guide](../../wiki/guides/autosave.md); it stays a
  consumer concern, matching CodeMirror / TipTap / Lexical.
- **Richer in-place decorations** beyond math and headings (tables, callouts,
  embeds).
- **Real-time collaboration (CRDT)** — kept out of core to stay lightweight;
  single-author persistence is callback-based (`onChange`, `onSave`).

---

## Consequences

### Positive

- A Notion/Obsidian-class writing experience with no loss of Markdown fidelity.
- The v1 surface is small enough to build in the foundation-first order (plain
  editing surface → decorations → chrome) without a customization backlog
  blocking release.
- No styling or icon dependency reaches the consumer's bundle; one CSS import,
  framework-agnostic.
- Every deferred item is independently shippable.

### Costs / considerations

- CodeMirror 6 decoration logic needs careful test coverage so cursor navigation
  around math blocks and decorated widgets stays smooth.
- Hand-written CSS Modules trade some authoring speed for zero build-time
  dependency — acceptable at this surface size; revisit only if the UI grows
  substantially.
- The `icons` prop must be ergonomic enough that dropping in a full icon set is
  trivial, since the built-ins are intentionally minimal.

## Alternatives rejected

- **Tailwind v3 + PostCSS for internal styling.** A utility-class toolchain
  (config, `content` globs, purge step) is disproportionate for a small, bounded
  UI. CSS Modules produce the same static `dist/styles.css` and the same
  "consumer needs no Tailwind" guarantee with no build-time dependency. Tailwind
  and shadcn/ui's _visual conventions_ are kept as a reference; the tooling is
  not.
- **`lucide-react` (or any icon package) as a dependency.** A package for ~12
  glyphs is a cost on every consumer. Inline SVG paths plus the `icons` override
  prop cover it.
- **CSS-in-JS (styled-components / Emotion).** Runtime injection, SSR hydration
  friction, and an added dependency, for no gain over static CSS Modules.
- **Shipping the full shadcn/ui token set** (`--card`, `--popover`, `--muted`,
  `--destructive`, `--input`, …). More surface than the editor chrome needs; the
  exposed token list is deliberately held to seven.
