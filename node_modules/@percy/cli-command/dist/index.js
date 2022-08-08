export { default, command } from './command.js';
export { legacyCommand, legacyFlags as flags } from './legacy.js'; // export common packages to avoid dependency resolution issues

export { default as PercyConfig } from '@percy/config';
export { default as logger } from '@percy/logger';