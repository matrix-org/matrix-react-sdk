# eslint-plugin-deprecate

[![NPM version](http://img.shields.io/npm/v/eslint-plugin-deprecate.svg)](https://www.npmjs.com/package/eslint-plugin-deprecate)

This plugin helps you to refactor your codebase.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-deprecate`:

```
$ npm install eslint-plugin-deprecate --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-deprecate` globally.

## Usage

Add `deprecate` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "deprecate"
    ]
}
```

Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "deprecate/rule-name": 2
    }
}
```

## Supported Rules

* [deprecate/function](docs/rules/function.md): Warn about some function usage.
* [deprecate/member-expression](docs/rules/member-expression.md): Warn about some member expression usages.
* [deprecate/import](docs/rules/import.md): Warn about some import/require usage.
