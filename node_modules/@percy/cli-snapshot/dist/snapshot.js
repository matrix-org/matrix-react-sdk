import fs from 'fs';
import path from 'path';
import command from '@percy/cli-command';
import * as SnapshotConfig from './config.js';
export const snapshot = command('snapshot', {
  description: 'Snapshot a static directory, snapshots file, or sitemap URL',
  args: [{
    name: 'dir|file|sitemap',
    description: 'Static directory, snapshots file, or sitemap url',
    required: true,
    attribute: val => {
      if (/^https?:\/\//.test(val)) return 'sitemap';
      if (!fs.existsSync(val)) throw new Error(`Not found: ${val}`);
      return fs.lstatSync(val).isDirectory() ? 'serve' : 'file';
    }
  }],
  flags: [{
    name: 'base-url',
    description: 'The base url pages are hosted at when snapshotting',
    type: 'string',
    short: 'b'
  }, {
    name: 'include',
    description: 'One or more globs/patterns matching snapshots to include',
    type: 'pattern',
    multiple: true
  }, {
    name: 'exclude',
    description: 'One or more globs/patterns matching snapshots to exclude',
    type: 'pattern',
    multiple: true
  }, {
    // static only
    name: 'clean-urls',
    description: 'Rewrite static index and filepath URLs to be clean',
    percyrc: 'static.cleanUrls',
    group: 'Static'
  }, {
    // deprecated
    name: 'files',
    deprecated: ['1.0.0', '--include'],
    percyrc: 'static.include',
    type: 'pattern'
  }, {
    name: 'ignore',
    deprecated: ['1.0.0', '--exclude'],
    percyrc: 'static.exclude',
    type: 'pattern'
  }],
  examples: ['$0 ./public', '$0 snapshots.yml', '$0 https://percy.io/sitemap.xml'],
  percy: {
    deferUploads: true
  },
  config: {
    schemas: [SnapshotConfig.configSchema],
    migrations: [SnapshotConfig.configMigration]
  }
}, async function* ({
  percy,
  args,
  flags,
  log,
  exit
}) {
  let {
    include,
    exclude,
    baseUrl,
    cleanUrls
  } = flags;
  let {
    file,
    serve,
    sitemap
  } = args; // parse and validate the --base-url flag after args are parsed

  if (file || serve) baseUrl && (baseUrl = parseBaseUrl(baseUrl, !!serve)); // only continue if percy is not disabled

  if (!percy) exit(0, 'Percy is disabled');

  try {
    let options;
    /* istanbul ignore else: arg is required and always one of these */

    if (file) {
      // load snapshots file
      let snapshots = yield loadSnapshotFile(file); // accept a config object instead of an array of snapshots

      let config = Array.isArray(snapshots) ? {
        snapshots
      } : snapshots;
      options = merge(config, {
        baseUrl,
        include,
        exclude
      });
    } else if (serve) {
      // serve and snapshot a static directory
      let config = {
        serve,
        cleanUrls,
        baseUrl,
        include,
        exclude
      };
      options = merge(percy.config.static, config);
    } else if (sitemap) {
      // fetch urls to snapshot from a sitemap
      let config = {
        sitemap,
        include,
        exclude
      };
      options = merge(percy.config.sitemap, config);
    }

    yield* percy.yield.start();
    yield* percy.yield.snapshot(options);
    yield* percy.yield.stop();
  } catch (error) {
    await percy.stop(true);
    throw error;
  }
}); // Validates the provided `--base-url` flag and returns a `baseUrl` string if valid. The flag is
// validated and parsed differently for static directories and snapshot files.

function parseBaseUrl(baseUrl, pathOnly) {
  try {
    let needsHost = pathOnly && baseUrl.startsWith('/');
    let url = new URL(baseUrl, needsHost ? 'http://localhost' : undefined);
    return pathOnly ? url.pathname : url.href;
  } catch (e) {
    throw new Error("The '--base-url' flag must " + (pathOnly ? 'start with a forward slash (/) when providing a static directory' : 'include a protocol and hostname when providing a list of snapshots'));
  }
} // Small shallow merge util that does not merge null or undefined values.


function merge(...objs) {
  return objs.reduce((target, obj) => {
    for (let k in obj) target[k] = obj[k] ?? target[k];

    return target;
  }, {});
} // Loads snapshot options from a js, json, or yaml file.


async function loadSnapshotFile(file) {
  let ext = path.extname(file);

  if (ext === '.js') {
    let {
      default: module
    } = await import(path.resolve(file));
    return typeof module === 'function' ? await module() : module;
  } else if (ext === '.json') {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } else if (ext.match(/\.ya?ml$/)) {
    let {
      default: YAML
    } = await import('yaml');
    return YAML.parse(fs.readFileSync(file, 'utf-8'));
  } else {
    throw new Error(`Unsupported filetype: ${file}`);
  }
}

export default snapshot;