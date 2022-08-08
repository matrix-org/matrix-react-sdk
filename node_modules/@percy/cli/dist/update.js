import fs from 'fs';
import url from 'url';
import path from 'path';
import logger from '@percy/logger';
import { colors } from '@percy/logger/utils';
import { getPackageJSON } from '@percy/cli-command/utils'; // filepath where the cache will be read and written to

const CACHE_FILE = path.resolve(url.fileURLToPath(import.meta.url), '../../.releases'); // max age the cache should be used for (3 days)

const CACHE_MAX_AGE = 3 * 24 * 60 * 60 * 1000; // Safely read from CACHE_FILE and return an object containing `data` mirroring what was previously
// written using `writeToCache(data)`. An empty object is returned when older than CACHE_MAX_AGE,
// and an `error` will be present if one was encountered.

function readFromCache() {
  let cached = {};

  try {
    if (fs.existsSync(CACHE_FILE)) {
      let {
        createdAt,
        data
      } = JSON.parse(fs.readFileSync(CACHE_FILE));
      if (Date.now() - createdAt < CACHE_MAX_AGE) cached.data = data;
    }
  } catch (error) {
    let log = logger('cli:update:cache');
    log.debug('Unable to read from cache');
    log.debug(cached.error = error);
  }

  return cached;
} // Safely write data to CACHE_FILE with the current timestamp.


function writeToCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      createdAt: Date.now(),
      data
    }));
  } catch (error) {
    let log = logger('cli:update:cache');
    log.debug('Unable to write to cache');
    log.debug(error);
  }
} // Fetch and return release information for @percy/cli.


async function fetchReleases(pkg) {
  let {
    request
  } = await import('@percy/client/utils'); // fetch releases from the github api without retries

  let api = 'https://api.github.com/repos/percy/cli/releases';
  let data = await request(api, {
    headers: {
      'User-Agent': pkg.name
    },
    retries: 0
  }); // return relevant information

  return data.map(r => ({
    tag: r.tag_name,
    prerelease: r.prerelease
  }));
} // Check for updates by comparing latest releases with the current version. The result of the check
// is cached to speed up subsequent CLI usage.


export async function checkForUpdate() {
  let {
    data: releases,
    error: cacheError
  } = readFromCache();
  let pkg = getPackageJSON(import.meta.url);
  let log = logger('cli:update');

  try {
    // request new release information if needed
    if (!releases) {
      releases = await fetchReleases(pkg);
      if (!cacheError) writeToCache(releases, log);
    } // check the current package version against released versions


    let versions = releases.map(r => r.tag.substr(1));
    let age = versions.indexOf(pkg.version); // a new version is available

    if (age !== 0) {
      let range = `${colors.red(pkg.version)} -> ${colors.green(versions[0])}`;
      log.stderr.write('\n');
      log.warn(`${age > 0 && age < 10 ? 'A new version of @percy/cli is available!' : 'Heads up! The current version of @percy/cli is more than 10 releases behind!'} ${range}`);
      log.stderr.write('\n');
    }
  } catch (err) {
    log.debug('Unable to check for updates');
    log.debug(err);
  }
}
export default checkForUpdate;