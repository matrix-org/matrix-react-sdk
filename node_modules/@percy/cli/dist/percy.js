import command from '@percy/cli-command';
import { getPackageJSON } from '@percy/cli-command/utils';
import { importCommands } from './commands.js';
const pkg = getPackageJSON(import.meta.url);
export const percy = command('percy', {
  version: `${pkg.name} ${pkg.version}`,
  commands: () => importCommands(),
  exitOnError: true
});
export default percy;