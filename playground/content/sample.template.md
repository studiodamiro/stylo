---
title: Field notes
created: 2026-09-04
tags: [demo, markdown, latex]
status: draft
---

# Field notes

A working document for exercising Stylo the way a real app would: loaded from a
file over `GET /api/doc`, edited here, and written back with `PUT` on
`Cmd/Ctrl+S` or after a short idle.

## Prose and inline marks

Text can be **bold**, _italic_, ~~struck through~~, or `inline code`. In the
in-place canvas the markers stay hidden until the caret lands on the line. A
[regular link](https://codemirror.net) and a wikilink to [[Getting Started]], or
a labelled one: [[api/reference|the API reference]].

> A blockquote, to check vertical rhythm and the left rule.

> [!note] Callout
> Callouts render from a blockquote with a `[!type]` first line. This one is a
> `note`; `tip`, `warning`, `danger`, and `example` are the other buckets.

## Math

Inline: $e^{i\pi} + 1 = 0$ and $\nabla \cdot \mathbf{E} = \rho / \varepsilon_0$.

A display block:

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

## A table

| Surface    | Renders live       | Loads render chunk |
| ---------- | ------------------ | ------------------ |
| `source`   | no                 | no                 |
| `in-place` | yes                | on first paint     |
| `preview`  | yes                | yes                |
| `split`    | yes (preview pane) | yes                |

## Task list

- [x] load the document from a file
- [x] edit it in place
- [ ] save it back and diff the result
- [ ] try the same doc in `preview` and `split`

## Fenced code

```ts
const greet = (name: string): string => `hello, ${name}`
```

```python
def greet(name: str) -> str:
    return f"hello, {name}"
```

---

Last line, after a divider — a good place to test caret movement past the end.
