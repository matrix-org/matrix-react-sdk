import load, { search } from './load.js';
import validate, { addSchema } from './validate.js';
import migrate, { addMigration } from './migrate.js';
import { merge, normalize, stringify } from './utils/index.js';
import getDefaults from './defaults.js'; // public config API

export { load, search, validate, addSchema, migrate, addMigration, getDefaults, merge, normalize, stringify }; // export the namespace by default

export * as default from './index.js';