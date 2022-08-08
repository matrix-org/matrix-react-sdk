import command from '@percy/cli-command';
export const finalize = command('finalize', {
  description: 'Finalize parallel Percy builds',
  percy: true
}, async ({
  env,
  percy,
  log,
  exit
}) => {
  if (!percy) exit(0, 'Percy is disabled'); // automatically set parallel total to -1

  env.PERCY_PARALLEL_TOTAL || (env.PERCY_PARALLEL_TOTAL = '-1'); // ensure that this command is not used for other parallel totals

  if (env.PERCY_PARALLEL_TOTAL !== '-1') {
    log.error('This command should only be used with PERCY_PARALLEL_TOTAL=-1');
    log.error(`Current value is "${env.PERCY_PARALLEL_TOTAL}"`);
    exit(1);
  }

  log.info('Finalizing parallel build...'); // rely on the parallel nonce to cause the API to return the current running build for the nonce

  let {
    data: build
  } = await percy.client.createBuild();
  await percy.client.finalizeBuild(build.id, {
    all: true
  });
  let {
    'build-number': number,
    'web-url': url
  } = build.attributes;
  log.info(`Finalized build #${number}: ${url}`);
});
export default finalize;