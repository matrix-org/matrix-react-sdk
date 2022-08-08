import fs from 'fs';
import path from 'path';
import command, { PercyConfig } from '@percy/cli-command';
export const migrate = command('migrate', {
  description: 'Migrate a Percy config file to the latest version',
  args: [{
    name: 'filepath',
    description: 'Current config filepath, detected by default'
  }, {
    name: 'output',
    description: 'New config filepath to write to, defaults to \'filepath\''
  }],
  flags: [{
    name: 'dry-run',
    description: 'Print the new config without writing it',
    short: 'd'
  }],
  examples: ['$0', '$0 --dry-run', '$0 ./config/percy.yml', '$0 .percy.yml .percy.js']
}, async ({
  args,
  flags,
  log,
  exit
}) => {
  let {
    config,
    filepath: input
  } = PercyConfig.search(args.filepath);
  let output = args.output ? path.resolve(args.output) : input;
  if (!config) exit(1, 'Config file not found');
  log.info(`Found config file: ${path.relative('', input)}`); // if migrating versions, warn when latest

  if (input === output && config.version === 2) {
    exit(0, 'Config is already the latest version');
  } // migrate config


  log.info('Migrating config file...');
  let format = path.extname(output).replace(/^./, '') || 'yaml';
  let migrated = PercyConfig.migrate(config); // prefer kebab-case for yaml

  if (/^ya?ml$/.test(format)) {
    migrated = PercyConfig.normalize(migrated, {
      schema: '/config',
      kebab: true
    });
  } // stringify to the desired format


  let body = PercyConfig.stringify(format, migrated);

  if (!flags.dryRun) {
    let content = body;

    if (path.basename(output) === 'package.json') {
      // update the package.json entry by reading and modifying it
      let pkg = JSON.parse(fs.readFileSync(output));
      content = PercyConfig.stringify(format, { ...pkg,
        percy: migrated
      });
    } else if (input === output) {
      // rename input if it is the output
      let {
        dir,
        name,
        ext
      } = path.parse(input);
      fs.renameSync(input, path.join(dir, `${name}.old${ext}`));
    } // write to output


    fs.writeFileSync(output, content);
  }

  log.info('Config file migrated!'); // when dry-running, print config to stdout when finished

  if (flags.dryRun) {
    log.stdout.write('\n' + body);
  }
});
export default migrate;