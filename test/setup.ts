import "@testing-library/jest-dom/vitest"

// jsdom implements neither `Range.getClientRects` nor `getBoundingClientRect`.
// CodeMirror calls them whenever a transaction asks to scroll the caret into
// view; stub them so `scrollIntoView: true` dispatches don't throw in tests.
if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}
