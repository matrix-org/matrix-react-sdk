# @percy/config

Handles loading and adding options to Percy configuration files. Uses
[cosmiconfig](https://github.com/davidtheclark/cosmiconfig) to load configuration files and [JSON
schema](https://json-schema.org/) with [AJV](https://github.com/epoberezkin/ajv) to validate those
configuration files.

- [Loading config files](#loading-config-files)
- [Extending config options](#extending-config-options)

## Loading config files

The `.load()` method will load and validate a configuation file, optionally merging it with any
provided `overrides`. If no `path` is provided, will search for the first supported config found
from the current directory up to the home directoy. Configuration files are cached and reused unless
`reload` is `true`.

```js
import PercyConfig from '@percy/config'

// loading is done synchronously
const config = PercyConfig.load(options)
```

#### Options

- `path` — Config file path or directory containing a config file
- `overrides` — Config option overrides
- `reload` — Do not use cached config (**default** `false`)
- `bail` — Return undefined when failing validation (**default** `false`)
- `print` — Print info and error logs (**default** `false`)

#### Supported files

- `"percy"` entry in `package.json`
- `.percyrc` YAML or JSON file
- `.percy.json` JSON file
- `.percy.yaml` or `.percy.yml` YAML file
- `.percy.js` or `percy.config.js` file that exports an object

## Extending config options

The `.addSchema()` function will add a sub-schema to the Percy configuration file which will be
parsed and validated when `PercyConfig.load()` is called. See [JSON
schema](https://json-schema.org/) for possible schema options.

```js
import PercyConfig from '@percy/config'

PercyConfig.addSchema({
  propertyName: JSONSchema
})
```
