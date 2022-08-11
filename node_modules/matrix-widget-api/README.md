# matrix-widget-api

![npm](https://img.shields.io/npm/v/matrix-widget-api?style=for-the-badge)

JavaScript/TypeScript SDK for widgets & clients to communicate.

For help and support, visit [#matrix-widgets:matrix.org](https://matrix.to/#/#matrix-widgets:matrix.org) on Matrix.

*Disclaimer: Widgets are not yet in the Matrix spec, so this library may not work with other implementations.*

## Building

To transpile this project to JavaScript, run:

```
yarn install
yarn build
```

## Using the API without a bundler

If you're looking to drop the widget-api into a web browser without the use of a bundler, add a `script`
tag similar to the following:

```html
<script src="https://unpkg.com/matrix-widget-api@0.1.0/dist/api.min.js"></script>
```

Note that the version number may need changing to match the current release.

Once included, the widget-api will be available under `mxwidgets`. For example, `new mxwidgets.WidgetApi(...)`
to instantiate the `WidgetApi` class.

## Usage for widgets

The general usage for this would be:

```typescript
const widgetId = null; // if you know the widget ID, supply it.
const api = new WidgetApi(widgetId);

// Before doing anything else, request capabilities:
api.requestCapability(MatrixCapabilities.Screenshots);
api.requestCapabilities(StickerpickerCapabilities);

// Add custom action handlers (if needed)
api.on(`action:${WidgetApiToWidgetAction.UpdateVisibility}`, (ev: CustomEvent<IVisibilityActionRequest>) => {
    ev.preventDefault(); // we're handling it, so stop the widget API from doing something.
    console.log(ev.detail); // custom handling here
    api.transport.reply(ev.detail, <IWidgetApiRequestEmptyData>{});
});
api.on("action:com.example.my_action", (ev: CustomEvent<ICustomActionRequest>) => {
    ev.preventDefault(); // we're handling it, so stop the widget API from doing something.
    console.log(ev.detail); // custom handling here
    api.transport.reply(ev.detail, {custom: "reply"});
});

// Start the messaging
api.start();

// If waitForIframeLoad is false, tell the client that we're good to go
api.sendContentLoaded();

// Later, do something else (if needed)
api.setAlwaysOnScreen(true);
api.transport.send("com.example.my_action", {isExample: true});
```

For a more complete example, see the `examples` directory of this repo.

## Usage for web clients

This SDK is meant for use in browser-based applications. The concepts may be transferable to other platforms,
though currently this SDK is intended to only be used by browsers. In the future it may be possible for this
SDK to provide an interface for other platforms.

TODO: Improve this

```typescript
const driver = new CustomDriver(); // an implementation of WidgetDriver
const api = new ClientWidgetApi(widget, iframe, driver);

// The API is automatically started, so we just have to wait for a ready before doing something
api.on("ready", () => {
    api.updateVisibility(true).then(() => console.log("Widget knows it is visible now"));
    api.transport.send("com.example.my_action", {isExample: true});
});

// Eventually, stop the API handling
api.stop();
```
