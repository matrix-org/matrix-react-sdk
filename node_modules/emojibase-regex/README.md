# Emojibase Regex

[![Build Status](https://github.com/milesj/emojibase/workflows/Build/badge.svg)](https://github.com/milesj/emojibase/actions?query=branch%3Amaster)
[![npm version](https://badge.fury.io/js/emojibase-regex.svg)](https://www.npmjs.com/package/emojibase-regex)
[![npm deps](https://david-dm.org/milesj/emojibase.svg?path=packages/regex)](https://www.npmjs.com/package/emojibase-regex)

Install the package.

```
yarn add emojibase-regex
```

Import and use the `RegExp` pattern.

```ts
import EMOJI_REGEX from 'emojibase-regex';
import EMOTICON_REGEX from 'emojibase-regex/emoticon';
import SHORTCODE_REGEX from 'emojibase-regex/shortcode';
import SHORTCODE_NATIVE_REGEX from 'emojibase-regex/shortcode-native';

`🏰`.match(EMOJI_REGEX);
':)'.match(EMOTICON_REGEX);
':castle:'.match(SHORTCODE_REGEX);
':гвинея:'.match(SHORTCODE_NATIVE_REGEX);
```

## Documentation

[https://emojibase.dev/docs/regex](https://emojibase.dev/docs/regex)
