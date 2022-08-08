import fs from 'fs';
import path from 'path';
import command from '@percy/cli-command';
import * as UploadConfig from './config.js';
const ALLOWED_FILE_TYPES = /\.(png|jpg|jpeg)$/i;
export const upload = command('upload', {
  description: 'Upload a directory of images to Percy',
  args: [{
    name: 'dirname',
    description: 'Directory of images to upload',
    required: true,
    validate: dir => {
      if (!fs.existsSync(dir)) {
        throw new Error(`Not found: ${dir}`);
      } else if (!fs.lstatSync(dir).isDirectory()) {
        throw new Error(`Not a directory: ${dir}`);
      }
    }
  }],
  flags: [{
    name: 'files',
    description: 'One or more globs matching image file paths to upload',
    default: UploadConfig.schema.upload.properties.files.default,
    percyrc: 'upload.files',
    type: 'pattern',
    multiple: true,
    short: 'f'
  }, {
    name: 'ignore',
    description: 'One or more globs matching image file paths to ignore',
    percyrc: 'upload.ignore',
    type: 'pattern',
    multiple: true,
    short: 'i'
  }, {
    name: 'strip-extensions',
    description: 'Strips file extensions from snapshot names',
    percyrc: 'upload.stripExtensions',
    short: 'e'
  }],
  examples: ['$0 ./images'],
  percy: {
    discoveryFlags: false,
    deferUploads: true
  },
  config: {
    schemas: [UploadConfig.schema],
    migrations: [UploadConfig.migration]
  }
}, async function* ({
  flags,
  args,
  percy,
  log,
  exit
}) {
  if (!percy) exit(0, 'Percy is disabled');
  let config = percy.config.upload;
  let {
    default: glob
  } = await import('fast-glob');
  let pathnames = yield glob(config.files, {
    ignore: [].concat(config.ignore || []),
    cwd: args.dirname,
    fs
  });

  if (!pathnames.length) {
    exit(1, `No matching files found in '${args.dirname}'`);
  }

  let {
    default: imageSize
  } = await import('image-size');
  let {
    createImageResources
  } = await import('./resources.js'); // the internal upload queue shares a concurrency with the snapshot queue

  percy.setConfig({
    discovery: {
      concurrency: config.concurrency
    }
  }); // do not launch a browser when starting

  yield* percy.yield.start({
    browser: false
  });

  for (let filename of pathnames) {
    let file = path.parse(filename);
    let name = config.stripExtensions ? path.join(file.dir, file.name) : filename;

    if (!ALLOWED_FILE_TYPES.test(filename)) {
      log.info(`Skipping unsupported file type: ${filename}`);
    } else {
      if (percy.dryRun) log.info(`Snapshot found: ${name}`);

      percy._scheduleUpload(filename, async () => {
        let filepath = path.resolve(args.dirname, filename);
        let buffer = fs.readFileSync(filepath); // width and height is clamped to API min and max

        let size = imageSize(filepath);
        let widths = [Math.max(10, Math.min(size.width, 2000))];
        let minHeight = Math.max(10, Math.min(size.height, 2000));
        let resources = createImageResources(filename, buffer, size);
        return {
          name,
          widths,
          minHeight,
          resources
        };
      }).then(() => {
        log.info(`Snapshot uploaded: ${name}`);
      });
    }
  }

  try {
    yield* percy.yield.stop();
  } catch (error) {
    await percy.stop(true);
    throw error;
  }
});
export default upload;