import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import Module from 'module';
import { command, legacyCommand, logger } from '@percy/cli-command'; // Helper to simplify reducing async functions

async function reduceAsync(iter, reducer, accum = []) {
  for (let i of iter) accum = await reducer(accum, i);

  return accum;
} // Helper to read and reduce files within a directory


function reduceFiles(dir, reducer) {
  return reduceAsync(fs.readdirSync(dir, {
    withFileTypes: true
  }), reducer);
} // Returns the paths of potential percy packages found within node_modules


function findModulePackages(dir) {
  try {
    // not given node_modules or a directory that contains node_modules, look up
    if (path.basename(dir) !== 'node_modules') {
      let modulesPath = path.join(dir, 'node_modules');
      let next = fs.existsSync(modulesPath) ? modulesPath : path.dirname(dir);
      if (next === dir || next === os.homedir()) return [];
      return findModulePackages(next);
    } // given node modules, look for percy packages


    return reduceFiles(dir, async (roots, file) => {
      let rootPath = path.join(dir, file.name);

      if (file.name === '@percy') {
        return roots.concat(await reduceFiles(rootPath, (dirs, f) => // specifically protect against files to allow linked directories
        f.isFile() ? dirs : dirs.concat(path.join(rootPath, f.name)), []));
      } else if (file.name.startsWith('percy-cli-')) {
        return roots.concat(rootPath);
      } else {
        return roots;
      }
    }, []);
  } catch (error) {
    logger('cli:plugins').debug(error);
    return [];
  }
} // Used by `findPnpPackages` to filter Percy CLI plugins


const PERCY_PKG_REG = /^(@percy\/|percy-cli-)/; // Returns the paths of potential percy packages found within yarn's pnp system

function findPnpPackages(dir) {
  var _Module$findPnpApi;

  let pnpapi = (_Module$findPnpApi = Module.findPnpApi) === null || _Module$findPnpApi === void 0 ? void 0 : _Module$findPnpApi.call(Module, `${dir}/`);
  let pkgLoc = pnpapi === null || pnpapi === void 0 ? void 0 : pnpapi.findPackageLocator(`${dir}/`);
  let pkgInfo = pkgLoc && (pnpapi === null || pnpapi === void 0 ? void 0 : pnpapi.getPackageInformation(pkgLoc));
  let pkgDeps = (pkgInfo === null || pkgInfo === void 0 ? void 0 : pkgInfo.packageDependencies.entries()) ?? [];
  return Array.from(pkgDeps).reduce((roots, [name, ref]) => {
    if (!ref || !PERCY_PKG_REG.test(name)) return roots;
    let depLoc = pnpapi.getLocator(name, ref);
    let depInfo = pnpapi.getPackageInformation(depLoc);
    return roots.concat(depInfo.packageLocation);
  }, []);
} // Helper to import and wrap legacy percy commands for reverse compatibility


function importLegacyCommands(commandsPath) {
  return reduceFiles(commandsPath, async (cmds, file) => {
    let filepath = path.join(commandsPath, file.name);
    let {
      name
    } = path.parse(file.name);

    if (file.isDirectory()) {
      // recursively import nested commands and find the index command
      let commands = await importLegacyCommands(filepath);
      let index = commands.findIndex(cmd => cmd.name === 'index'); // modify or create an index command to hold nested commands

      index = ~index ? commands.splice(index, 1)[0] : command();
      Object.defineProperty(index, 'name', {
        value: name
      });
      index.definition.commands = commands;
      return cmds.concat(index);
    } else {
      // find and wrap the command exported by the module
      let exports = Object.values(await import(url.pathToFileURL(filepath).href));
      let cmd = exports.find(e => {
        var _e$prototype;

        return typeof (e === null || e === void 0 ? void 0 : (_e$prototype = e.prototype) === null || _e$prototype === void 0 ? void 0 : _e$prototype.run) === 'function';
      });
      return cmd ? cmds.concat(legacyCommand(name, cmd)) : cmds;
    }
  });
} // Imports and returns compatibile CLI commands from various sources


export async function importCommands() {
  let root = path.resolve(url.fileURLToPath(import.meta.url), '../..'); // start with a set to get built-in deduplication

  let cmdPkgs = await reduceAsync(new Set([// find included dependencies
  root, // find potential sibling packages
  path.join(root, '..'), // find any current project dependencies
  process.cwd()]), async (roots, dir) => {
    if (fs.existsSync(path.join(dir, 'package.json'))) roots.push(dir);
    roots.push(...(await findModulePackages(dir)));
    roots.push(...(await findPnpPackages(dir)));
    return roots;
  }); // reduce found packages to functions which import cli commands

  let cmdImports = await reduceAsync(cmdPkgs, async (pkgs, pkgPath) => {
    var _pkg$oclif, _pkg$PercyCli;

    let pkg = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'))); // do not include self

    if (pkg.name === '@percy/cli') return pkgs; // support legacy oclif percy commands

    if (((_pkg$oclif = pkg.oclif) === null || _pkg$oclif === void 0 ? void 0 : _pkg$oclif.bin) === 'percy') {
      pkgs.set(pkg.name, async () => {
        var _pkg$oclif$hooks;

        if ((_pkg$oclif$hooks = pkg.oclif.hooks) !== null && _pkg$oclif$hooks !== void 0 && _pkg$oclif$hooks.init) {
          let initPath = path.join(pkgPath, pkg.oclif.hooks.init);
          let init = await import(url.pathToFileURL(initPath).href);
          await init.default();
        }

        if (pkg.oclif.commands) {
          let commandsPath = path.join(pkgPath, pkg.oclif.commands);
          return importLegacyCommands(commandsPath);
        }

        return [];
      });
    } // overwrite any found package of the same name


    if ((_pkg$PercyCli = pkg['@percy/cli']) !== null && _pkg$PercyCli !== void 0 && _pkg$PercyCli.commands) {
      pkgs.set(pkg.name, () => Promise.all(pkg['@percy/cli'].commands.map(async cmdPath => {
        var _module$default;

        let modulePath = path.join(pkgPath, cmdPath);
        let module = await import(url.pathToFileURL(modulePath).href);
        (_module$default = module.default).packageInformation || (_module$default.packageInformation = pkg);
        return module.default;
      })));
    }

    return pkgs;
  }, new Map()); // actually import found commands

  let cmds = await reduceAsync(cmdImports.values(), async (cmds, importCmds) => cmds.concat(await importCmds())); // sort standalone commands before command topics

  return cmds.sort((a, b) => {
    if (a.callback && !b.callback) return -1;
    if (b.callback && !a.callback) return 1;
    return a.name.localeCompare(b.name);
  });
}