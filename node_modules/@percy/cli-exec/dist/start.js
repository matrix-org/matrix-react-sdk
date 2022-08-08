import command from '@percy/cli-command';
import * as common from './common.js';
export const start = command('start', {
  description: 'Starts a local Percy snapshot server',
  flags: common.flags,
  examples: ['$0 &> percy.log'],
  percy: {
    server: true
  }
}, async function* ({
  percy,
  exit
}) {
  if (!percy) exit(0, 'Percy is disabled'); // start percy

  yield* percy.yield.start();

  try {
    // run until stopped or terminated
    while (percy.readyState < 3) {
      yield new Promise(r => setImmediate(r));
    }
  } catch (error) {
    await percy.stop(true);
    throw error;
  }
});
export default start;