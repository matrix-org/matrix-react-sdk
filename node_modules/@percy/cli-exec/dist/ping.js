import command from '@percy/cli-command';
import * as common from './common.js';
export const ping = command('ping', {
  description: 'Pings a local running Percy snapshot server',
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
  let ping = `http://localhost:${flags.port}/percy/healthcheck`;

  try {
    await request(ping, {
      retryNotFound: true,
      noProxy: true
    });
  } catch (err) {
    log.error('Percy is not running');
    log.debug(err);
    exit(1);
  }

  log.info('Percy is running');
});
export default ping;