# Counterpart

A translation and localization library for Node.js and the browser. The project is inspired by Ruby's famous [I18n gem](https://github.com/svenfuchs/i18n).

Features:

-  translation and localization
-  interpolation of values to translations (sprintf-style with named arguments)
-  pluralization (CLDR compatible)


## Installation

Install via npm:

```bash
% npm install counterpart
```


## Usage

Require the counterpart module to get a reference to the `translate` function:

```js
var translate = require('counterpart');
```

This function expects a `key` and `options` as arguments and translates, pluralizes and interpolates a given key using a given locale, scope, and fallback, as well as interpolation values.

### Lookup

Translation data is organized as a nested object using the top-level key as namespace. *E.g.*, the [damals package](https://github.com/martinandert/damals) ships with the translation:

```js
{
  damals: {
    about_x_hours_ago: {
      one:   'about one hour ago',
      other: 'about %(count)s hours ago'
    }
    /* ... */
  }
}
```

Translations can be looked up at any level of this object using the `key` argument and the `scope` option. *E.g.*, in the following example, a whole translation object is returned:

```js
translate('damals')  // => { about_x_hours_ago: { one: '...', other: '...' } }
```

The `key` argument can be either a single key, a dot-separated key or an array of keys or dot-separated keys. So these examples will all look up the same translation:

```js
translate('damals.about_x_hours_ago.one')          // => 'about one hour ago'
translate(['damals', 'about_x_hours_ago', 'one'])  // => 'about one hour ago'
translate(['damals', 'about_x_hours_ago.one'])     // => 'about one hour ago'
```

The `scope` option can be either a single key, a dot-separated key or an array of keys or dot-separated keys. Keys and scopes can be combined freely. Again, these examples will all look up the same translation:

```js
translate('damals.about_x_hours_ago.one')
translate('about_x_hours_ago.one', { scope: 'damals' })
translate('one', { scope: 'damals.about_x_hours_ago' })
translate('one', { scope: ['damals', 'about_x_hours_ago'] })
```

The `separator` option allows you to change what the key gets split via for nested objects. It also allows you to stop counterpart splitting keys if you have a flat object structure:

```js
translate('damals.about_x_hours_ago.one', { separator: '*' })
// => 'missing translation: en*damals.about_x_hours_ago.one'
```

Since we changed what our key should be split by counterpart will be looking for the following object structure:

```js
{
  'damals.about_x_hours_ago.one': 'about one hour ago'
}
```

The `setSeparator` function allows you to globally change the default separator used to split translation keys:

```js
translate.setSeparator('*') // => '.' (returns the previous separator)
```

There is also a `getSeparator` function which returns the currently set default separator.

### Interpolation

Translations can contain interpolation variables which will be replaced by values passed to the function as part of the options object, with the keys matching the interpolation variable names.

*E.g.*, with a translation `{ foo: 'foo %(bar)s' }` the option value for the key `bar` will be interpolated into the translation:

```js
translate('foo', { bar: 'baz' }) // => 'foo baz'
```

### Pluralization

Translation data can contain pluralized translations. Pluralized translations are provided as a sub-object to the translation key containing the keys `one`, `other` and optionally `zero`:

```js
{
  x_items: {
    zero:  'No items.',
    one:   'One item.',
    other: '%(count)s items.'
  }
}
```

Then use the `count` option to select a specific pluralization:

```js
translate('x_items', { count: 0  })  // => 'No items.'
translate('x_items', { count: 1  })  // => 'One item.'
translate('x_items', { count: 42 })  // => '42 items.'
```

The name of the option to select a pluralization is always `count`, don't use `itemsCount` or anything like that.

Note that this library currently only supports an algorithm for English-like pluralization rules (see [locales/en.js](locales/en.js). You can easily add  pluralization algorithms for other locales by [adding custom translation data](#adding-translation-data) to the "counterpart" namespace. Pull requests are welcome.

As seen above, the `count` option can be used both for pluralization and interpolation.

### Fallbacks

If for a key no translation could be found, `translate` returns an error string of the form "translation missing: %(key)s".

To mitigate this, provide the `fallback` option with an alternate text. The following example returns the translation for "baz" or "default" if no translation was found:

```js
translate('baz', { fallback: 'default' })
```

### Dealing with missing translations

When a translation key cannot be resolved to a translation, regardless of whether a fallback is provided or not, `translate` will emit an event you can listen to:

```js
translate.onTranslationNotFound(function(locale, key, fallback, scope) {
  // do important stuff here...
});
```

Use `translate.offTranslationNotFound(myHandler)` to stop listening to missing key events.

As stated in the Fallbacks section, if for a key no translation could be found, `translate` returns an error string of the form "translation missing: %(key)s".

You can customize this output by providing your own missing entry generator function:

```js
translate.setMissingEntryGenerator(function(key) {
  // console.error('Missing translation: ' + key);
  return 'OMG! No translation available for ' + key;
});
```

### Locales

The default locale is English ("en"). To change this, call the `setLocale` function:

```js
translate.getLocale()     // => 'en'
translate.setLocale('de') // => 'en' (returns the previous locale)
translate.getLocale()     // => 'de'
```

Note that it is advised to call `setLocale` only once at the start of the application or when the user changes her language preference. A library author integrating the counterpart package in a library should not call `setLocale` at all and leave that to the developer incorporating the library.

In case of a locale change, the `setLocale` function emits an event you can listen to:

```js
translate.onLocaleChange(function(newLocale, oldLocale) {
  // do important stuff here...
}, [callbackContext]);
```

Use `translate.offLocaleChange(myHandler)` to stop listening to locale changes.

You can temporarily change the current locale with the `withLocale` function:

```js
translate.withLocale(otherLocale, myCallback, [myCallbackContext]);
```

`withLocale` does not emit the locale change event. The function returns the return value of the supplied callback argument.

Another way to temporarily change the current locale is by using the `locale` option on `translate` itself:

```js
translate('foo', { locale: 'de' });
```

There are also `withScope` and `withSeparator` functions that behave exactly the same as `withLocale`.

### Fallback Locales

You can provide entire fallback locales as alternatives to hard-coded fallbacks.

```js
translate('baz', { fallbackLocale: 'en' });
```

Fallback locales can also contain multiple potential fallbacks. These will be tried sequentially until a key returns a successful value, or the fallback locales have been exhausted.

```js
translate('baz', { fallbackLocale: [ 'foo', 'bar', 'default' ] })
```

Globally, fallback locales can be set via the `setFallbackLocale` method.

```js
translate.setFallbackLocale('en')
translate.setFallbackLocale([ 'bar', 'en' ]) // Can also take multiple fallback locales
```

### Adding Translation Data

You can use the `registerTranslations` function to deep-merge data for a specific locale into the global translation object:

```js
translate.registerTranslations('de', require('counterpart/locales/de'));
translate.registerTranslations('de', require('./locales/de.json'));
```

The data object to merge should contain a namespace (e.g. the name of your app/library) as top-level key. The namespace ensures that there are no merging conflicts between different projects. Example (./locales/de.json):

```json
{
  "my_project": {
    "greeting": "Hallo, %(name)s!",
    "x_items": {
      "one":   "1 Stück",
      "other": "%(count)s Stücke"
    }
  }
}
```

The translations are instantly made available:

```js
translate('greeting', { scope: 'my_project', name: 'Martin' })  // => 'Hallo, Martin!'
```

Note that library authors should preload their translations only for the default ("en") locale, since tools like [webpack](http://webpack.github.io/) or [browserify](http://browserify.org/) will recursively bundle up all the required modules of a library into a single file. This will include even unneeded translations and so unnecessarily bloat the bundle.

Instead, you as a library author should advise end-users to on-demand-load translations for other locales provided by your package:

```js
// Execute this code to load the 'de' translations:
require('counterpart').registerTranslations('de', require('my_package/locales/de'));
```

### Registering Default Interpolations

Since v0.11, Counterpart allows you to register default interpolations using the `registerInterpolations` function. Here is an example:

```js
translate.registerTranslations('en', {
  my_namespace: {
    greeting: 'Welcome to %(app_name)s, %(visitor)s!'
  }
});

translate.registerInterpolations({ app_name: 'My Cool App' });

translate('my_namespace.greeting', { visitor: 'Martin' })
// => 'Welcome to My Cool App, Martin!'

translate('my_namespace.greeting', { visitor: 'Martin', app_name: 'The Foo App' })
// => 'Welcome to The Foo App, Martin!'
```

As you can see in the last line of the example, interpolations you give as options to the `translate` function take precedence over registered interpolations.

### Using a key transformer

Sometimes it is necessary to adjust the given translation key before the actual translation is made, e.g. when keys are passed in mixed case and you expect them to be all lower case. Use `setKeyTransformer` to provide your own transformation function:

```js
translate.setKeyTransformer(function(key, options) {
  return key.toLowerCase();
});
```

Counterpart's built-in key transformer just returns the given key argument.

### Localization

The counterpart package comes with support for localizing JavaScript Date objects. The `localize` function expects a date and options as arguments. The following example demonstrates the possible options.

```js
var date = new Date('Fri Feb 21 2014 13:46:24 GMT+0100 (CET)');

translate.localize(date)                       // => 'Fri, 21 Feb 2014 13:46'
translate.localize(date, { format: 'short' })  // => '21 Feb 13:46'
translate.localize(date, { format: 'long' })   // => 'Friday, February 21st, 2014 13:46:24 +01:00'

translate.localize(date, { type: 'date' })                  // => 'Fri, 21 Feb 2014'
translate.localize(date, { type: 'date', format: 'short' }) // => 'Feb 21'
translate.localize(date, { type: 'date', format: 'long' })  // => 'Friday, February 21st, 2014'

translate.localize(date, { type: 'time' })                  // => '13:46'
translate.localize(date, { type: 'time', format: 'short' }) // => '13:46'
translate.localize(date, { type: 'time', format: 'long' })  // => '13:46:24 +01:00'

translate.registerTranslations('de', require('counterpart/locales/de'));
translate.localize(date, { locale: 'de' })  // => 'Fr, 21. Feb 2014, 13:46 Uhr'
```

Sure, you can integrate custom localizations by adding to or overwriting the "counterpart" namespace. See [locales/en.js](locales/en.js) and [locales/de.js](locales/de.js) for example localization files.

### As an instance

You can invoke an instance of Counterpart should you need various locales displayed at once in your application:

```js
var Counterpart = require('counterpart').Instance;

var instance = new Counterpart();

instance.registerTranslations('en', { foo: 'bar' });
instance.translate('foo');
```

### Error handling

When a translation fails, `translate` will emit an event you can listen to:

```js
translate.onError(function(err, entry, values) {
  // do some error handling here...
});
```

Use `translate.offError(myHandler)` to stop listening for errors.

## Contributing

Here's a quick guide:

1. Fork the repo and `make install`.
1. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean slate: `make test`.
1. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or are fixing a bug, we need a test!
1. Make the test pass.
1. Push to your fork and submit a pull request.


## License

Released under The MIT License.
