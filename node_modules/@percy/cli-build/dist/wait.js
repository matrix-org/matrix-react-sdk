import command from '@percy/cli-command';
export const wait = command('wait', {
  description: 'Wait for a build to be finished',
  flags: [{
    name: 'build',
    description: 'Build ID',
    exclusive: ['project', 'commit'],
    type: 'id',
    short: 'b'
  }, {
    name: 'project',
    description: 'Build project slug, requires \'--commit\'',
    requires: ['commit'],
    type: 'slug',
    short: 'p'
  }, {
    name: 'commit',
    description: 'Build commit sha, requires \'--project\'',
    requires: ['project'],
    type: 'sha',
    short: 'c'
  }, {
    name: 'timeout',
    description: 'Timeout before exiting without updates, defaults to 10 minutes',
    type: 'ms',
    parse: Number,
    short: 't'
  }, {
    name: 'interval',
    description: 'Interval at which to poll for updates, defaults to 1 second',
    type: 'ms',
    parse: Number,
    short: 'i'
  }, {
    name: 'fail-on-changes',
    description: 'Exit with an error when diffs are found',
    short: 'f'
  }],
  examples: ['$0 --build 2222222', '$0 --project org/project --commit HEAD'],
  percy: true
}, async function* ({
  flags,
  percy,
  log,
  exit
}) {
  if (!percy) exit(0, 'Percy is disabled'); // do not wait directly on the promise as to not block the event loop

  let waiting = percy.client.waitForBuild(flags, build => {
    logProgress(build, log);
    if (isFailing(build, flags)) exit(1);
  }); // wait between event loops to allow process termination

  let handleDone = () => waiting.done = true;

  waiting.then(handleDone, handleDone);

  while (!waiting.done) {
    yield new Promise(r => setImmediate(r));
  } // bubble errors


  yield waiting;
}); // Log build progress

function logProgress({
  attributes: {
    state,
    'web-url': url,
    'build-number': number,
    'failure-reason': failReason,
    'failure-details': failDetails,
    'total-snapshots': count,
    'total-comparisons': total,
    'total-comparisons-diff': diffs,
    'total-comparisons-finished': finished
  }
}, log) {
  switch (state) {
    case 'pending':
      return log.progress('Recieving snapshots...');

    case 'processing':
      return log.progress(`Processing ${count} snapshots - ` + (finished === total ? 'finishing up...' : `${finished} of ${total} comparisons finished...`));

    case 'finished':
      log.info(`Build #${number} finished! ${url}`);
      return log.info(`Found ${diffs} changes`);

    case 'failed':
      log.error(`Build #${number} failed! ${url}`);
      return log.error(failureMessage(failReason, failDetails));

    default:
      return log.error(`Build #${number} is ${state}. ${url}`);
  }
} // Create failure messages


function failureMessage(type, {
  missing_parallel_builds: missingParallel,
  parallel_builds_received: parallelCount,
  parallel_builds_expected: parallelTotal
} = {}) {
  switch (type) {
    case 'render_timeout':
      return 'Some snapshots in this build took too long ' + 'to render even after multiple retries.';

    case 'no_snapshots':
      return 'No snapshots were uploaded to this build.';

    case 'missing_finalize':
      return 'Failed to correctly finalize.';

    case 'missing_resources':
      return missingParallel ? `Only ${parallelCount} of ${parallelTotal} parallel builds were received.` : 'Some build or snapshot resources failed to correctly upload.';

    default:
      return `Error: ${type}`;
  }
} // Return true or false if a build is considered failing or not


function isFailing({
  attributes: {
    state,
    'total-comparisons-diff': diffs
  }
}, {
  failOnChanges
}) {
  // not pending and not processing
  return state !== 'pending' && state !== 'processing' && ( // not finished or finished with diffs
  state !== 'finished' || failOnChanges && !!diffs);
}

export default wait;