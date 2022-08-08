import { resetPercyConfig, mockfs as mfs, fs } from '@percy/config/test/helpers';
import logger from '@percy/logger/test/helpers';
import api from '@percy/client/test/helpers';
import path from 'path';
import url from 'url';

export function mockfs(initial) {
  return mfs({
    ...initial,

    $bypass: [
      path.resolve(url.fileURLToPath(import.meta.url), '/../../../dom/dist/bundle.js'),
      p => p.includes?.('.local-chromium'),
      ...(initial?.$bypass ?? [])
    ]
  });
}

export async function setupTest({
  resetConfig,
  filesystem,
  loggerTTY,
  apiDelay
} = {}) {
  await api.mock({ delay: apiDelay });
  await logger.mock({ isTTY: loggerTTY });
  await resetPercyConfig(resetConfig);
  await mockfs(filesystem);
}

export * from '@percy/client/test/helpers';
export { createTestServer } from './server.js';
export { dedent } from './dedent.js';
export { logger, fs };
