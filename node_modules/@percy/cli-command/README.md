# @percy/cli-command

Percy CLI command parser and runner.

- [Usage](#usage)
- [Options](#options)
  - [Args](#args)
  - [Flags](#flags)
  - [Percy](#percy)

## Usage

The `command` function accepts a name, definition, and callback and returns a runner function that
accepts an array of command-line arguments.

``` js
import command from '@percy/cli-command';

// example command runner
const example = command('example', {
  description: 'Example command description',
  // positional arguments
  args: [
    { name: 'one' }
  ],
  // flags and options
  flags: [
    { name: 'foo' }, // boolean by default
    { name: 'bar', type: 'string' }
  ],
  // shows in help output
  examples: [
    // $0 will be replaced by the command name
    '$0 --foo --bar baz qux'
  ]
}, ({ flags, args }) => {
  // see below for other available properties
  console.log({ flags, args });
});

// remove the script name from argv
example(process.argv.slice(2));
```

``` shell
$ node ./example --foo --bar baz qux
{ flags: { foo: true, bar: 'baz' }, args: { one: 'qux' } }
```

## Options

Only a command `name` is required. However, without any other options, a command will only show the
default help output with global flags. A command's `callback` will be called when the resulting
command runner is invoked with an array of command-line arguments. How those arguments are
interpreted and parsed is defined by the command's `definition`.

- `name` — The command name shown in help output, also used to match nested commands.
- `definition` — A command definition object defines various options to control help output, the
  arguments parser, and other percy options.
  - `description` — The command description shown in help output.
  - `usage` — Custom command usage shown in help output.
  - `examples` — An array of example strings to show in help output.
  - `version` — A version string to display via a `-V, --version` flag.
  - `commands` — An array or function returning an array of nested subcommands.
  - `flags` — Optional flag arguments accepted by the command ([see below](#flags)).
  - `args` — Positional arguments accepted by the command ([see below](#args)).
  - `percy` — Enable creation of a core percy instance ([see below](#percy)).
  - `config` — Automatic percy config registration ([see below](#percy)).
  - `loose` — Push unknown arguments to `argv`. A string value will log as a warning when unknown
    arguments are first encountered by the parser.
  - `exitOnError` — Call `process.exit()` if the command encounters an error while running.
- `callback` — The command callback invoked after the runner is called with command-line arguments
  and after those arguments are interpreted by the internal parser.

The `callback` argument can be a function, an async function, or an async generator function. Given
an async generator function, the command becomes cancelable via process interruption and is able to
clean up after itself using traditional try-catch error handling.

The `callback` function is invoked with a single argument containing various contextual properties
according to the command definition:

- `flags` — An object containing key-value pairs of flag arguments interpreted by the parser as
  determined by the flag's respective definition ([see below](#flags)).
- `args` — An object containing key-value pairs of positional arguments interpreted by the parser as
  determined by the arg's respective definition ([see below](#args)).
- `argv` — An array of unknown arguments that were not parsed due to either the `loose` option or
  the presence of an end-of-arguments delimiter (`--`).
- `percy` — An instance of `@percy/core` only present when a corresponding `percy` definition option
  is provided ([see below](#percy)).
- `log` — A `@percy/logger` group namespaced under the command's `name`. The initial loglevel is
  optionally determined by various global logging flags (`--verbose`, `--silent`, `--quiet`).
- `exit` — Utility function to stop the execution of a command from within the runner. Accepts
  an exit code (default `1`) and an exit reason (default `'EEXIT: ${exitCode}'`). The function will
  throw an error which can be handled, or let bubble where the presence of `exitOnError` will cause
  the process to exit with the provided exit code.

### Flags

Each flag definition must contain either a `name` or a `short` option. By default, all flags will be
interpreted as boolean flags and will produce an error if a value is provided. Setting the `type`
option to anything other than `'boolean'` will allow providing command-line values and error if one
_is not_ provided.

- `name` — The flag name (i.e. `--flag-name`).
- `short` — The flag short character (i.e. `-s`).
- `type` — The flag type as displayed in help output.
- `default` — The flag's default value when not provided.
- `parse` — A function used to parse any provided flag value.
- `validate` — A function that should throw an error when the provided flag value is invalid.
- `attribute` — A string or function returning a string to set the value at on the `callback`
  argument's `flags` property. Defaults to the camelcase `name` or `short` character.
- `percyrc` — A string to map this flag to percy config options ([see below](#percy)).
- `deprecated` — A boolean, string, or tuple used to warn about a deprecated flag and optionally map
  it to an alternate flag ([see below](#deprecations)).

### Args

Positional args correspond to their definition index, so the arg definition at index `0` will match
the first provided command-line argument that is not a flag or subcommand. By default, positional
args are optional, but can be configured to be required or have default values.

- `name` — The arg name shown in help output.
- `required` — Indicate that this flag is required, which causes an error when not provided.
- `default` — The arg's default value when not provided.
- `parse` — A function used to parse the provided argument.
- `validate` — A function that should throw an error when the provided argument is invalid.
- `attribute` — A string or function returning a string to set the value at on the `callback`
  argument's `args` property. Defaults to camelcase `name`.
- `percyrc` — A string to map this arg to percy config options ([see below](#percy)).
- `deprecated` — A boolean, string, or tuple used to warn about a deprecated arg and optionally map
  it to a flag ([see below](#deprecations)).

#### Deprecations

When the `deprecated` option is `true` and the flag or positional arg has been provided by
command-line arguments, a deprecation warning will be logged. A string value indicates the version
in which this argument will be removed and is reflected in the deprecation message.

<details>
  <summary>Remapping deprecated arguments</summary><br>

When providing a tuple, the version is the first option of the tuple, while the second option can be
an alternate flag to use, or a recommendation message to display when the deprecation warning is
logged. Given an alternate flag, the value will be automatically mapped to the corresponding flag's
attribute name on the `callback` argument's `flags` property.

``` js
{ name: 'foo', deprecated: true }
// [percy] Warning: The '--foo' option will be removed in a future release.

{ name: 'foo', deprecated: 'v2.0.0' }
// [percy] Warning: The '--foo' option will be removed in v2.0.0.

{ name: 'foo', deprecated: ['v2.0.0', '--bar'] }
// [percy] Warning: The '--foo' option will be removed in v2.0.0. Use '--bar' instead.

{ name: 'foo', deprecated: ['v2.0.0', 'Use the config file option instead.'] }
// [percy] Warning: The '--foo' option will be removed in v2.0.0. Use the config file option instead.
```
</details>

### Percy

The `percy` definition option accepts an object consisting of `@percy/core` options. The presence of
this option will add shared percy flags to accepted command-line arguments and provide the command
callback with a percy instance initialized with the provided options.

When the `percy` definition option is `true`, shared percy flags will not be accepted, but a default
percy instance will still be provided to the command callback when run. Regardless of the `percy`
option, if the environment variable `PERCY_ENABLE` is `0`, the callback _will not_ receive a percy
instance (and can act accordingly).

- `percy` — Enables creation of a `@percy/core` instance initialized with provided options.
  - `discoveryFlags` — When `false` prevents percy discovery flags from being accepted, but will
    still allow other percy flags such as `--config` and `--dry-run`.
  - `...` — All other options are passed along to the new percy instance.

#### Config

Acceptable percy config file options can be extended before the file is loaded via
`PercyConfig.addSchema()` and `PercyConfig.addMigration()`. These functions can be called before the
command is run to achieve the same effect as including them in the command definition. However, the
presence of a `percy` definition option will also signal `@percy/core` config schemas and migrations
to be automatically registered before the following options are registered.

- `config` — Percy config schemas and migrations to register while creating the command runner.
  - `schemas` — An array of percy config schemas to automatically register.
  - `migrations` — An array of percy config migrations to automatically register.

Additionally, flags and positional arguments that define a `percyrc` option will have their
associated values mapped to a corresponding `percy` property that is used when initializing a
`@percy/core` instance. Provided options are validated against config schemas and are made available
on the command callback argument's `percy.config` property.
