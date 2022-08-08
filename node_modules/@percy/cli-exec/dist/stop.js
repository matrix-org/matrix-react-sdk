import command from '@percy/cli-command';
import * as common from './common.js';
export const stop = command('stop', {
  description: 'Stops a local running Percy snapshot server',
  flags: common.flags,
  percy: true
}, async ({
  flags,
  percy,
  log,
  exit
}) => {
  if (!percy) exit(0, 'Percy is disabled');
  let {
    request
  } = await import('@percy/cli-command/utils');
  let stop = `http://localhost:${flags.port}/percy/stop`;
  let ping = `http://localhost:${flags.port}/percy/healthcheck`;

  try {
    await request(stop, {
      method: 'POST',
      noProxy: true
    });
  } catch (err) {
    log.error('Percy is not running');
    log.debug(err);
    exit(1);
  } // retry heathcheck until it fails


  await new Promise(function check(resolve) {
    return request(ping, {
      noProxy: true
    }).then(() => setTimeout(check, 100, resolve)).catch(resolve);
  });
  log.info('Percy has stopped');
});
export default stop;