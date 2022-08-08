import fs from 'fs';
import { relative } from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import logger from '@percy/logger';
import migrate from './migrate.js';
import validate from './validate.js';
import getDefaults from './defaults.js';
import { inspect, normalize } from './utils/index.js'; // Loaded configuration file cache

export const cache = new Map(); // The cosmiconfig explorer used to load config files

export const explorer = cosmiconfigSync('percy', {
  cache: false,
  searchPlaces: ['package.json', '.percyrc', '.percy.json', '.percy.yaml', '.percy.yml', '.percy.js', 'percy.config.js']
}); // Searches within a provided directory, or loads the provided config path

export function search(path) {
  try {
    let result = path && !fs.statSync(path).isDirectory() ? explorer.load(path) : explorer.search(path);
    return result || {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};else throw error;
  }
} // Finds and loads a config file using cosmiconfig, merges it with optional
// inputs, validates the combined config according to the schema, and returns
// the combined config. Loaded config files are cached and reused on next load,
// unless `reload` is true in which the file will be reloaded and the cache
// updated. Validation errors are logged as warnings and the config is returned
// unless `bail` is true. Supports kebab-case and camelCase config options and
// always returns camelCase options. Will automatically convert older config
// versions to the latest version while printing a warning.

export function load({
  path,
  overrides = {},
  reload = false,
  bail = false,
  print = false
} = {}) {
  var _Array$from;

  // load cached config; when no path is specified, get the last config cached
  let config = path ? cache.get(path) : (_Array$from = Array.from(cache)[cache.size - 1]) === null || _Array$from === void 0 ? void 0 : _Array$from[1];
  let infoDebug = print ? 'info' : 'debug';
  let errorDebug = print ? 'error' : 'debug';
  let log = logger('config'); // load config or reload cached config

  if (path !== false && (!config || reload)) {
    try {
      let result = search(path);

      if (result !== null && result !== void 0 && result.config) {
        log[infoDebug](`Found config file: ${relative('', result.filepath)}`);
        let version = parseInt(result.config.version, 10);

        if (Number.isNaN(version)) {
          log.warn('Ignoring config file - missing or invalid version');
        } else if (version > 2) {
          log.warn(`Ignoring config file - unsupported version "${version}"`);
        } else {
          if (version < 2) {
            log.warn('Found older config file version, please run ' + '`percy config:migrate` to update to the latest version');
          }

          config = migrate(result.config);
          cache.set(path, config);
        }
      } else {
        log[infoDebug]('Config file not found');
        if (bail) return;
      }
    } catch (error) {
      log[errorDebug](error);
      if (bail) return;
    }
  } // normalize and merge with overrides then validate


  config = normalize(config, {
    overrides,
    schema: '/config'
  });
  let errors = config && validate(config);

  if (errors) {
    log.warn('Invalid config:');

    for (let e of errors) log.warn(`- ${e.path}: ${e.message}`);

    if (bail) return;
  }

  if (path !== false && config) {
    log[infoDebug](`Using config:\n${inspect(config)}`);
  } // merge with defaults


  return getDefaults(config);
}
export default load;