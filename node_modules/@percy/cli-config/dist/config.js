import command from '@percy/cli-command';
import create from './create.js';
import validate from './validate.js';
import migrate from './migrate.js';
export const config = command('config', {
  description: 'Manage Percy config files',
  commands: [create, validate, migrate]
});
export default config;