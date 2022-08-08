# @percy/cli-upload

Percy CLI command to uploade a directory of static images to Percy for diffing.

## Commands
<!-- commands -->
* [`percy upload`](#percy-upload)

### `percy upload`

Upload a directory of images to Percy

```
Usage:
  $ percy upload [options] <dirname>

Arguments:
  dirname                 Directory of images to upload

Options:
  -f, --files [pattern]   One or more globs matching image file paths to upload (default:
                          "**/*.{png,jpg,jpeg}")
  -i, --ignore <pattern>  One or more globs matching image file paths to ignore
  -e, --strip-extensions  Strips file extensions from snapshot names

Percy options:
  -c, --config <file>     Config file path
  -d, --dry-run           Print snapshot names only

Global options:
  -v, --verbose           Log everything
  -q, --quiet             Log errors only
  -s, --silent            Log nothing
  -h, --help              Display command help

Examples:
  $ percy upload ./images
```
<!-- commandsstop -->

## Percy Configuration

This CLI plugin adds the following Percy configuration options (defaults shown).

```yaml
# defaults
version: 2
upload:
  strip-extensions: false
  files: '**/*.{png,jpg,jpeg}'
  ignore: ''
```

- **strip-extensions** - Strips file extensions from snapshot names
- **files** - A glob or array of globs matching file paths to upload
- **ignore** - A glob or array of globs matching file paths to ignore
