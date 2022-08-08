import fs from 'fs';
import path from 'path';
import command, { PercyConfig } from '@percy/cli-command';
const DEFAULT_FILES = {
  rc: '.percyrc',
  yaml: '.percy.yaml',
  yml: '.percy.yml',
  json: '.percy.json',
  js: '.percy.js'
};
const FILETYPES = Object.keys(DEFAULT_FILES);
export const create = command('create', {
  description: 'Create a Percy config file',
  args: [{
    name: 'filepath',
    description: 'Optional config filepath'
  }],
  flags: [{
    name: 'rc',
    description: 'Create a .percyrc file',
    conflicts: FILETYPES.filter(t => t !== 'rc'),
    type: 'boolean'
  }, {
    name: 'yaml',
    description: 'Create a .percy.yaml file',
    conflicts: FILETYPES.filter(t => t !== 'yaml'),
    type: 'boolean'
  }, {
    name: 'yml',
    description: 'Create a .percy.yml file',
    conflicts: FILETYPES.filter(t => t !== 'yml'),
    type: 'boolean'
  }, {
    name: 'json',
    description: 'Create a .percy.json file',
    conflicts: FILETYPES.filter(t => t !== 'json'),
    type: 'boolean'
  }, {
    name: 'js',
    description: 'Create a .percy.js file',
    conflicts: FILETYPES.filter(t => t !== 'js'),
    type: 'boolean'
  }],
  examples: ['$0', '$0 --yaml', '$0 --json', '$0 --js', '$0 --rc', '$0 ./config/percy.yml']
}, async ({
  flags,
  args,
  log,
  exit
}) => {
  // discern the filetype
  let filetype = args.filepath ? path.extname(args.filepath).replace(/^./, '') : FILETYPES.find(t => flags[t]) ?? 'yml'; // verify the filetype is supported

  if (!DEFAULT_FILES[filetype]) {
    exit(1, `Unsupported filetype: ${filetype}`);
  } // default filepath based on filetype


  let filepath = args.filepath || DEFAULT_FILES[filetype]; // verify the file does not already exist

  if (fs.existsSync(filepath)) {
    exit(1, `Percy config already exists: ${filepath}`);
  } // write stringified default config options to the filepath


  let format = ['rc', 'yaml', 'yml'].includes(filetype) ? 'yaml' : filetype;
  fs.mkdirSync(path.dirname(filepath), {
    recursive: true
  });
  fs.writeFileSync(filepath, PercyConfig.stringify(format));
  log.info(`Created Percy config: ${filepath}`);
});
export default create;