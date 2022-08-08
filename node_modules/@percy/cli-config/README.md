# @percy/cli-config

Uses [`@percy/config`](/packages/config) to add CLI commands for creating, validating, and updating
Percy configuration files.

## Commands
<!-- commands -->
* [`percy config:create`](#percy-configcreate)
* [`percy config:validate`](#percy-configvalidate)
* [`percy config:migrate`](#percy-configmigrate)

### `percy config:create`

Create a Percy config file

```
Usage:
  $ percy config:create [options] [filepath]

Arguments:
  filepath       Optional config filepath

Options:
  --rc           Create a .percyrc file
  --yaml         Create a .percy.yaml file
  --yml          Create a .percy.yml file
  --json         Create a .percy.json file
  --js           Create a .percy.js file

Global options:
  -v, --verbose  Log everything
  -q, --quiet    Log errors only
  -s, --silent   Log nothing
  -h, --help     Display command help

Examples:
  $ percy config:create
  $ percy config:create --yaml
  $ percy config:create --json
  $ percy config:create --js
  $ percy config:create --rc
  $ percy config:create ./config/percy.yml
```

### `percy config:validate`

Validate a Percy config file

```
Usage:
  $ percy config:validate [options] [filepath]

Arguments:
  filepath       Config filepath, detected by default

Global options:
  -v, --verbose  Log everything
  -q, --quiet    Log errors only
  -s, --silent   Log nothing
  -h, --help     Display command help

Examples:
  $ percy config:validate
  $ percy config:validate ./config/percy.yml
```

### `percy config:migrate`

Migrate a Percy config file to the latest version

```
Usage:
  $ percy config:migrate [options] [filepath] [output]

Arguments:
  filepath       Current config filepath, detected by default
  output         New config filepath to write to, defaults to 'filepath'

Options:
  -d, --dry-run  Print the new config without writing it

Global options:
  -v, --verbose  Log everything
  -q, --quiet    Log errors only
  -s, --silent   Log nothing
  -h, --help     Display command help

Examples:
  $ percy config:migrate
  $ percy config:migrate --dry-run
  $ percy config:migrate ./config/percy.yml
  $ percy config:migrate .percy.yml .percy.js
```
<!-- commandsstop -->
