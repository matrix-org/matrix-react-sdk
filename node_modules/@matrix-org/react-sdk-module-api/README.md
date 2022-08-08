# matrix-react-sdk-module-api

API surface for interacting with the [matrix-react-sdk](https://github.com/matrix-org/matrix-react-sdk) in a safe
and predictable way.

Modules are simply additional functionality added at compile time for the application and can do things like register
custom translations, translation overrides, open dialogs, and add/modify UI.

**Note**: This project is still considered alpha/beta quality due to the API surface not being extensive. Please reach
out in [#element-dev:matrix.org](https://matrix.to/#/#element-dev:matrix.org) on Matrix for guidance on how to add to
this API surface.

In general, new code should target a generalized interface. An example would be the `openDialog()` function: while the
first module to use it didn't need custom `props`, it is expected that a dialog would at some point, so we expose it.
On the other hand, we deliberately do not expose the complexity of the react-sdk's dialog stack to this layer until
we need it. We might choose to open sticky dialogs with a new `openStickyDialog()` function instead of appending more
arguments to the existing function.

## Using the API

Modules are simply standalone npm packages which get installed/included in the app at compile time. To start, we
recommend using a simple module as a template, such as [element-web-ilag-module](https://github.com/vector-im/element-web-ilag-module).

The package's `main` entrypoint MUST point to an instance of `RuntimeModule`. That class must be a `default` export
for the module loader to reference correctly.

The `RuntimeModule` instance MUST have a constructor which accepts a single `ModuleApi` parameter. This is supplied
to the `super()` constructor.

Otherwise, simply `npm install --save @matrix-org/react-sdk-module-api` and start coding!

### Custom translations / string overrides

Custom translation strings (used within your module) or string overrides can be specified using the `registerTranslations`
function on a `ModuleApi` instance. For example:

```typescript
this.moduleApi.registerTranslations({
    // If you use the translation utilities within your module, register your strings
    "My custom string": {
        "en": "My custom string",
        "fr": "Ma chaîne personnalisée",
    },
    
    // If you want to override a string already in the app, such as the power level role
    // names, use the base string here and redefine the values for each applicable language.
    "A string that might already exist in the app": {
        "en": "Replacement value for that string",
        "fr": "Valeur de remplacement pour cette chaîne",
    },
});
```

If you are within a class provided by the module API then translations are generally accessible with `this.t("my string")`.
This is a shortcut to `this.moduleApi.translateString()` which in turn calls into the translation engine at runtime to
determine which appropriately-translated string should be returned.

### Opening dialogs

Dialogs are opened through the `openDialog()` function on a `ModuleApi` instance. They accept a return model, component
properties definition, and a dialog component type. The dialog component itself must extend `DialogContent<>` from
the module API in order to open correctly.

The dialog component overrides `trySubmit()` and returns a promise for the return model, which is then passed back through
to the promise returned by `openDialog()`. 

The `DialogContent<>` component is supplied with supporting components at the react-sdk layer to make dialog handling
generic: all a module needs to do is supply the content that goes into the dialog.

### Using standard UI elements

The react-sdk provides a number of components for building Matrix clients as well as some supporting components to make
it easier to have standardized styles on things like text inputs. Modules are naturally interested in these components
so their UI looks nearly indistinguishable from the rest of the app, however the react-sdk's components are not able to
be accessed directly.

Instead, similar to dialogs and translations, modules use a proxy component which gets replaced by the real thing at
runtime. For example, there is a `TextInputField` component supplied by the module API which gets translated into a
decorated field at runtime for the module.

**Note for react-sdk maintainers:** Don't forget to set the `renderFactory` of these components, otherwise the UI will
be subpar.

### Account management

Modules can register for an account without overriding the logged-in user's auth data with the `registerSimpleAccount()`
function on a `ModuleApi` instance. If the module would like to use that auth data, or has a different set of
authentication information in mind, it can call `overwriteAccountAuth()` on a `ModuleApi` instance to overwrite 
(**without warning**) the current user's session.

### View management

From the `RuntimeModule` instance, modules can listen to various events that happen within the client to override
a small bit of the UI behaviour. For example, listening for `RoomViewLifecycle.PreviewRoomNotLoggedIn` allows the module
to change the behaviour of the "room preview bar" to enable future cases of `RoomViewLifecycle.JoinFromRoomPreview`
being raised for additional handling.

The module can also change what room/user/entity the user is looking at, and join it (if it's a room), with 
`navigatePermalink` on a `ModuleApi` instance.

## Contributing / developing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for the mechanics of the contribution process.

For development, it is recommended to set up a normal element-web development environment and `yarn link` the
module API into both the react-sdk and element-web layers.

Visit [#element-dev:matrix.org](https://matrix.to/#/#element-dev:matrix.org) for support with getting a development
environment going.

## Releases

Because this is a scoped package, it needs to be published in a special way:

```bash
npm publish --access public
```
