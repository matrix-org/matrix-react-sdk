import command, { PercyConfig } from '@percy/cli-command';
export const validate = command('validate', {
  description: 'Validate a Percy config file',
  args: [{
    name: 'filepath',
    description: 'Config filepath, detected by default'
  }],
  examples: ['$0', '$0 ./config/percy.yml']
}, async ({
  args,
  log,
  exit
}) => {
  // verify a config file can be located
  let {
    config,
    filepath
  } = PercyConfig.search(args.filepath);
  if (!config) exit(1, 'Config file not found'); // when `bail` is true, .load() returns undefined when validation fails

  let result = PercyConfig.load({
    path: filepath,
    print: true,
    bail: true
  }); // exit 1 when config is empty

  if (!result) exit(1);
});
export default validate;