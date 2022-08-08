import fs from 'fs';
import os from 'os';
import url from 'url';
import path from 'path';
import Module from 'module';

// Reset various global @percy/config internals for testing
export async function resetPercyConfig(all) {
  // aliased to src during tests
  let { clearMigrations } = await import('../dist/migrate.js');
  let { resetSchema } = await import('../dist/validate.js');
  let { cache } = await import('../dist/load.js');
  if (all) clearMigrations();
  if (all) resetSchema();
  cache.clear();
}

// When mocking fs, these classes should not be spied on
const FS_CLASSES = [
  'Stats', 'Dirent',
  'StatWatcher', 'FSWatcher',
  'ReadStream', 'WriteStream'
];

// Used to bypass mocking internal package files
const INTERNAL_FILE_REG = new RegExp(
  '(/|\\\\)(packages)\\1((?:(?!\\1).)+?)\\1' +
    '(src|dist|test|package\\.json)(\\1|$)'
);

// Mock and spy on fs methods using an in-memory filesystem
export async function mockfs({
  // set `true` to allow mocking files within `node_modules` (may cause dynamic import issues)
  $modules = false,
  // list of filepaths or function matchers to allow direct access to the real filesystem
  $bypass = [],
  // initial flat map of files and/or directories to create
  ...initial
} = {}) {
  let memfs = await import('memfs');
  let vol = new memfs.Volume();

  // automatically cleanup mock imports
  global.__MOCK_IMPORTS__?.clear();

  // when .js files are created, also mock the module for importing
  spyOn(vol, 'writeFileSync').and.callFake((...args) => {
    if (args[0].endsWith('.js')) mockFileModule(...args);
    return vol.writeFileSync.and.originalFn.apply(vol, args);
  });

  // initial volume contents include the cwd and tmpdir
  vol.fromJSON({
    [process.cwd()]: null,
    [os.tmpdir()]: null,
    ...initial
  });

  let bypass = [
    // bypass babel config for runtime registration
    path.resolve(url.fileURLToPath(import.meta.url), '../../../../babel.config.cjs'),
    // bypass descriptors that don't exist in the current volume
    p => typeof p === 'number' && !vol.fds[p],
    // bypass node_modules by default to avoid dynamic import issues
    p => !$modules && p.includes?.('node_modules'),
    // bypass internal package files to avoid dynamic import issues
    p => p.match?.(INTERNAL_FILE_REG) && !vol.existsSync(p),
    // additional bypass matches
    ...$bypass
  ];

  // spies on fs methods and calls in-memory methods unless bypassed
  let installFakes = (og, fake) => {
    for (let k in og) {
      if (k in fake && typeof og[k] === 'function' && !FS_CLASSES.includes(k)) {
        spyOn(og, k).and.callFake((...args) => bypass.some(p => (
          typeof p === 'function' ? p(...args) : (p === args[0])
        )) ? og[k].and.originalFn(...args) : fake[k](...args));
      }
    }
  };

  // mock and install fs methods using the in-memory filesystem
  let mock = memfs.createFsFromVolume(vol);
  installFakes(fs.promises, mock.promises);
  installFakes(fs, mock);

  // allow tests access to the in-memory filesystem
  fs.$bypass = bypass;
  fs.$vol = vol;
  return vol;
}

// Mock module loading to avoid node using internal C++ fs bindings
function mockFileModule(filepath, content = '') {
  if (!jasmine.isSpy(Module._load)) {
    spyOn(Module, '_load').and.callThrough();
    spyOn(Module, '_resolveFilename').and.callThrough();
  }

  let mod = new Module();
  let fp = mod.filename = path.resolve(filepath);
  let any = { asymmetricMatch: () => true };

  let matchFilepath = {
    asymmetricMatch: f => path.resolve(f) === fp ||
      fp.endsWith(path.join('node_modules', f))
  };

  Module._resolveFilename.withArgs(matchFilepath, any).and.returnValue(fp);
  Module._load.withArgs(matchFilepath, any, any).and.callFake(() => {
    mod.loaded = mod.loaded || (mod._compile(content, fp), true);
    return mod.exports;
  });
}

// export fs for convenience
export { fs };
