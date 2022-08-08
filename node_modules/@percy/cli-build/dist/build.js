import command from '@percy/cli-command';
import finalize from './finalize.js';
import wait from './wait.js';
export const build = command('build', {
  description: 'Finalize and wait on Percy builds',
  commands: [finalize, wait]
});
export default build;