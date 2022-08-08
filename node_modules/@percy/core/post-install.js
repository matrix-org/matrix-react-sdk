import fs from 'fs';

try {
  if (process.env.PERCY_POSTINSTALL_BROWSER) {
    // Automatically download and install Chromium if PERCY_POSTINSTALL_BROWSER is set
    await import('./dist/install.js').then(install => install.chromium());
  } else if (!process.send && fs.existsSync('./src')) {
    // In development, fork this script with the development loader and always install
    await import('child_process').then(cp => cp.fork('./post-install.js', {
      execArgv: ['--no-warnings', '--loader=../../scripts/loader.js'],
      env: { PERCY_POSTINSTALL_BROWSER: true }
    }));
  }
} catch (error) {
  const { logger } = await import('@percy/logger');
  const log = logger('core:post-install');

  log.error('Encountered an error while installing Chromium');
  log.error(error);
}
