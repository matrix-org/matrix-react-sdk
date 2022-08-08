import logger from '@percy/logger';
import { get, set, del, map, joinPropertyPath, normalize } from './utils/index.js'; // Global set of registered migrations

const migrations = new Map(); // Register a migration function for the main config schema by default

export function addMigration(migration, schema = '/config') {
  if (Array.isArray(migration)) {
    return migration.map(m => addMigration(m, schema));
  } else if (typeof migration !== 'function') {
    return Object.entries(migration).map(([s, m]) => addMigration(m, s));
  }

  if (!migrations.has(schema)) migrations.set(schema, []);
  migrations.get(schema).unshift(migration);
  return migration;
} // Clear all migration functions

export function clearMigrations() {
  migrations.clear();
  addMigration(defaultMigration);
} // The default config migration

addMigration(defaultMigration);

function defaultMigration(config, {
  set
}) {
  if (config.version !== 2) set('version', 2);
} // Migrate util for deprecated options


function deprecate(config, log, path, options) {
  if (get(config, path) == null) return;
  let {
    type,
    until: ver,
    map: mapto,
    alt,
    warn
  } = options;
  let name = joinPropertyPath(path);
  let to = joinPropertyPath(mapto);
  let message = 'The ' + [type ? `${type} option \`${name}\`` : `\`${name}\` option`, `will be removed in ${ver || 'a future release'}.`, to ? `Use \`${to}\` instead.` : alt || ''].join(' ').trim();
  if (warn) log.warn(`Warning: ${message}`);else log.deprecated(message);
  return to ? map(config, path, to) : config;
} // Calls each registered migration function with a normalize provided config
// and util functions for working with the config object


export function migrate(config, schema = '/config') {
  config = normalize(config, {
    schema
  }) ?? {};

  if (migrations.has(schema)) {
    let log = logger('config');
    let util = {
      deprecate: deprecate.bind(null, config, log),
      set: set.bind(null, config),
      map: map.bind(null, config),
      del: del.bind(null, config),
      log
    };

    for (let migration of migrations.get(schema)) {
      migration(config, util);
    } // normalize again to adjust for migrations


    config = normalize(config, {
      schema
    });
  }

  return config;
}
export default migrate;