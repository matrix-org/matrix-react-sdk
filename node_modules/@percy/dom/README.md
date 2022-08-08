# @percy/dom

Serializes a document's DOM into a DOM string suitable for re-rendering.

- [Usage](#usage)
  - [ES6 imports](#es6-imports)
  - [Browser injection](#browser-injection)
  - [Options](#options)
- [Serialized Content](#serialize-content)
  - [Input elements](#input-elements)
  - [Frame elements](#frame-elements)
  - [CSSOM rules](#cssom-rules)
  - [Canvas elements](#canvas-elements)
  - [Video elements](#video-elements)
  - [Other elements](#other-elements)

## Usage

### ES6 imports

```js
import serializeDOM from '@percy/dom';

// optional arguments shown with defaults
const domSnapshot = serializeDOM(options)
```

### Browser injection

```js
// via puppeteer
await page.addScriptTag({ path: require.resolve('@percy/dom') })
const domSnapshot = await page.evaluate(() => PercyDOM.serialize(options))
```

### Options

- `enableJavaScript` — When true, does not serialize some DOM elements
- `domTransformation` — Function to transform the DOM after serialization

## Serialized Content

The following serialization happens to a cloned instance of the document in order.

### Input elements

Input elements (`input`, `textarea`, `select`) are serialized by setting respective DOM attributes
to their matching JavaScript property counterparts. For example `checked`, `selected`, and `value`.

### Frame elements

Frame elements are serialized when they are CORS accessible and if they haven't been built by
JavaScript when JavaScript is enabled. They are serialized by recursively serializing the iframe's
own document element.

### CSSOM rules

When JavaScript is not enabled, CSSOM rules are serialized by iterating over and appending each rule
to a new stylesheet inserted into the document's head.

### Canvas elements

Canvas elements' drawing buffers are serialized as data URIs and the canvas elements are replaced
with image elements. The image elements reference the serialized data URI and have the same HTML
attributes as their respective canvas elements. The image elements also have a max-width of 100% to
accomidate responsive layouts in situations where canvases may be expected to resize with JS.

### Video elements

Videos without a `poster` attribute will have the current frame of the video
serialized into an image and set as the `poster` attribute automatically. This is
to ensure videos have a stable image to display when screenshots are captured.

### Other elements

_All other elements are not serialized._ The resulting cloned document is passed to any provided
`domTransformation` option before the serialize function returns a DOM string.
