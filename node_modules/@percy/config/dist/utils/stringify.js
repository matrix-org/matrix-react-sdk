import util from 'util';
import YAML from 'yaml';
import getDefaults from '../defaults.js'; // Provides native util.inspect with common options for printing configs.

export function inspect(config) {
  return util.inspect(config, {
    depth: null,
    compact: false
  });
} // Converts a config to a yaml, json, or js string. When no config is provided,
// falls back to schema defaults.

export function stringify(format, config = getDefaults()) {
  switch (format) {
    case 'yml':
    case 'yaml':
      return YAML.stringify(config);

    case 'json':
      return JSON.stringify(config, null, 2) + '\n';

    case 'js':
      return `module.exports = ${inspect(config)}\n`;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
export default stringify;