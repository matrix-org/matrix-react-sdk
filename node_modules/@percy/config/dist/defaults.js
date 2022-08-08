import { merge } from './utils/index.js';
import { getSchema } from './validate.js';
const {
  isArray
} = Array;
const {
  assign,
  entries
} = Object; // Recursively walks a schema and collects defaults. When no schema is provided,
// the default config schema is used.

function getDefaultsFromSchema(schema) {
  if (!schema || typeof schema.$ref === 'string') {
    // get the schema from ajv
    return getDefaultsFromSchema(getSchema((schema === null || schema === void 0 ? void 0 : schema.$ref) ?? '/config'));
  } else if (schema.default != null) {
    // return the default for this schema
    return schema.default;
  } else if (schema.type === 'object' && schema.properties) {
    // return an object of default properties
    return entries(schema.properties).reduce((acc, [prop, schema]) => {
      let def = getDefaultsFromSchema(schema);
      return def != null ? assign(acc || {}, {
        [prop]: def
      }) : acc;
    }, undefined);
  } else {
    return undefined;
  }
}

export function getDefaults(overrides = {}) {
  return merge([getDefaultsFromSchema(), overrides], (path, prev, next) => {
    // override default array instead of merging
    return isArray(next) && [path, next];
  });
}
export default getDefaults;