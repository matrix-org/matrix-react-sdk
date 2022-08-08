import logger from '@percy/logger'; // Global CLI flags

export const verbose = {
  name: 'verbose',
  description: 'Log everything',
  exclusive: ['quiet', 'silent'],
  parse: () => !!logger.loglevel('debug'),
  group: 'Global',
  short: 'v'
};
export const quiet = {
  name: 'quiet',
  description: 'Log errors only',
  exclusive: ['verbose', 'silent'],
  parse: () => !!logger.loglevel('warn'),
  group: 'Global',
  short: 'q'
};
export const silent = {
  name: 'silent',
  description: 'Log nothing',
  exclusive: ['verbose', 'quiet'],
  parse: () => !!logger.loglevel('silent'),
  group: 'Global',
  short: 's'
}; // Common percy and asset discovery flags

export const config = {
  name: 'config',
  description: 'Config file path',
  percyrc: 'config',
  type: 'file',
  group: 'Percy',
  short: 'c'
};
export const dryRun = {
  name: 'dry-run',
  description: 'Print snapshot names only',
  percyrc: 'dryRun',
  group: 'Percy',
  short: 'd'
};
export const allowedHostnames = {
  name: 'allowed-hostname',
  description: 'Allowed hostnames to capture in asset discovery',
  percyrc: 'discovery.allowedHostnames',
  type: 'hostname',
  multiple: true,
  group: 'Percy',
  short: 'h'
};
export const disallowedHostnames = {
  name: 'disallowed-hostname',
  description: 'Disallowed hostnames to abort in asset discovery',
  percyrc: 'discovery.disallowedHostnames',
  type: 'hostname',
  multiple: true,
  group: 'Percy'
};
export const networkIdleTimeout = {
  name: 'network-idle-timeout',
  description: 'Asset discovery network idle timeout',
  percyrc: 'discovery.networkIdleTimeout',
  type: 'ms',
  parse: Number,
  group: 'Percy',
  short: 't'
};
export const disableCache = {
  name: 'disable-cache',
  description: 'Disable asset discovery caches',
  percyrc: 'discovery.disableCache',
  group: 'Percy'
};
export const debug = {
  name: 'debug',
  description: 'Debug asset discovery and do not upload snapshots',
  parse: () => !!logger.loglevel('debug'),
  percyrc: 'skipUploads',
  group: 'Percy'
}; // Group constants

export const GLOBAL = [verbose, quiet, silent];
export const PERCY = [config, dryRun];
export const DISCOVERY = [allowedHostnames, disallowedHostnames, networkIdleTimeout, disableCache, debug];