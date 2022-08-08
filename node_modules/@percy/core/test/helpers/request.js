export async function request(url, method = 'GET', handle) {
  if (typeof method === 'boolean' || typeof method === 'function') [handle, method] = [method, 'GET'];
  let cb = typeof handle === 'boolean' ? (handle ? (...a) => a : (_, r) => r) : handle;
  let options = typeof method === 'string' ? { method } : method;
  let { request } = await import('@percy/client/utils');

  try {
    return await request(url, options, cb);
  } catch (error) {
    if (!error.response || typeof handle !== 'boolean') throw error;
    return handle ? [error.response.body, error.response] : error.response;
  }
}

export default request;
