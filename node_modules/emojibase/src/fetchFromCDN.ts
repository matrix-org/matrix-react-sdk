import { FetchFromCDNOptions } from './types';

/**
 * This function will fetch `emojibase-data` JSON files from our CDN, parse them,
 * and return the response. It requires a file path relative to the `emojibase-data` package
 * as the 1st argument and an optional object of options as the 2rd argument.
 *
 * ```ts
 * import { fetchFromCDN } from 'emojibase';
 *
 * await fetchFromCDN('ja/compact.json', { version: '2.1.3' });
 * ```
 */
export async function fetchFromCDN<T>(path: string, options: FetchFromCDNOptions = {}): Promise<T> {
	const { local = false, version = 'latest', ...opts } = options;

	if (__DEV__) {
		if (!path || !path.endsWith('.json')) {
			throw new Error('A valid JSON dataset is required to fetch.');
		}

		if (!version) {
			throw new Error('A valid release version is required.');
		}
	}

	const storage = local ? localStorage : sessionStorage;
	const cacheKey = `emojibase/${version}/${path}`;
	const cachedData = storage.getItem(cacheKey);

	// Check the cache first
	if (cachedData) {
		return Promise.resolve(JSON.parse(cachedData) as T);
	}

	// eslint-disable-next-line compat/compat
	const response = await fetch(`https://cdn.jsdelivr.net/npm/emojibase-data@${version}/${path}`, {
		credentials: 'omit',
		mode: 'cors',
		redirect: 'error',
		...opts,
	});

	if (!response.ok) {
		throw new Error('Failed to load Emojibase dataset.');
	}

	const data = (await response.json()) as T;

	try {
		storage.setItem(cacheKey, JSON.stringify(data));
	} catch {
		// Do not allow quota errors to break the app
	}

	return data;
}
