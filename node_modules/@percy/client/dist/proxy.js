import net from 'net';
import tls from 'tls';
import http from 'http';
import https from 'https';
import logger from '@percy/logger';
const CRLF = '\r\n';
const STATUS_REG = /^HTTP\/1.[01] (\d*)/; // Returns true if the URL hostname matches any patterns

export function hostnameMatches(patterns, url) {
  let subject = new URL(url);
  /* istanbul ignore next: only strings are provided internally by the client proxy; core (which
   * borrows this util) sometimes provides an array of patterns or undefined */

  patterns = typeof patterns === 'string' ? patterns.split(/[\s,]+/) : [].concat(patterns);

  for (let pattern of patterns) {
    if (pattern === '*') return true;
    if (!pattern) continue; // parse pattern

    let {
      groups: rule
    } = pattern.match(/^(?<hostname>.+?)(?::(?<port>\d+))?$/); // missing a hostname or ports do not match

    if (!rule.hostname || rule.port && rule.port !== subject.port) {
      continue;
    } // wildcards are treated the same as leading dots


    rule.hostname = rule.hostname.replace(/^\*/, ''); // hostnames are equal or end with a wildcard rule

    if (rule.hostname === subject.hostname || rule.hostname.startsWith('.') && subject.hostname.endsWith(rule.hostname)) {
      return true;
    }
  }

  return false;
} // Returns the port number of a URL object. Defaults to port 443 for https
// protocols or port 80 otherwise.

export function port(options) {
  if (options.port) return options.port;
  return options.protocol === 'https:' ? 443 : 80;
} // Returns a string representation of a URL-like object

export function href(options) {
  let {
    protocol,
    hostname,
    path,
    pathname,
    search,
    hash
  } = options;
  return `${protocol}//${hostname}:${port(options)}` + (path || `${pathname || ''}${search || ''}${hash || ''}`);
}
; // Returns the proxy URL for a set of request options

export function getProxy(options) {
  let proxyUrl = options.protocol === 'https:' && (process.env.https_proxy || process.env.HTTPS_PROXY) || process.env.http_proxy || process.env.HTTP_PROXY;
  let shouldProxy = !!proxyUrl && !hostnameMatches(process.env.no_proxy || process.env.NO_PROXY, href(options));

  if (shouldProxy) {
    proxyUrl = new URL(proxyUrl);
    let isHttps = proxyUrl.protocol === 'https:';

    if (!isHttps && proxyUrl.protocol !== 'http:') {
      throw new Error(`Unsupported proxy protocol: ${proxyUrl.protocol}`);
    }

    let proxy = {
      isHttps
    };
    proxy.auth = !!proxyUrl.username && 'Basic ' + (proxyUrl.password ? Buffer.from(`${proxyUrl.username}:${proxyUrl.password}`) : Buffer.from(proxyUrl.username)).toString('base64');
    proxy.host = proxyUrl.hostname;
    proxy.port = port(proxyUrl);

    proxy.connect = () => (isHttps ? tls : net).connect({
      rejectUnauthorized: options.rejectUnauthorized,
      host: proxy.host,
      port: proxy.port
    });

    return proxy;
  }
} // Proxified http agent

export class ProxyHttpAgent extends http.Agent {
  // needed for https proxies
  httpsAgent = new https.Agent({
    keepAlive: true
  });

  addRequest(request, options) {
    var _request$outputData;

    let proxy = getProxy(options);
    if (!proxy) return super.addRequest(request, options);
    logger('client:proxy').debug(`Proxying request: ${options.href}`); // modify the request for proxying

    request.path = href(options);

    if (proxy.auth) {
      request.setHeader('Proxy-Authorization', proxy.auth);
    } // regenerate headers since we just changed things


    delete request._header;

    request._implicitHeader();

    if (((_request$outputData = request.outputData) === null || _request$outputData === void 0 ? void 0 : _request$outputData.length) > 0) {
      let first = request.outputData[0].data;
      let endOfHeaders = first.indexOf(CRLF.repeat(2)) + 4;
      request.outputData[0].data = request._header + first.substring(endOfHeaders);
    } // coerce the connection to the proxy


    options.port = proxy.port;
    options.host = proxy.host;
    delete options.path;

    if (proxy.isHttps) {
      // use the underlying https agent to complete the connection
      request.agent = this.httpsAgent;
      return this.httpsAgent.addRequest(request, options);
    } else {
      return super.addRequest(request, options);
    }
  }

} // Proxified https agent

export class ProxyHttpsAgent extends https.Agent {
  constructor(options) {
    // default keep-alive
    super({
      keepAlive: true,
      ...options
    });
  }

  createConnection(options, callback) {
    let proxy = getProxy(options);
    if (!proxy) return super.createConnection(options, callback);
    logger('client:proxy').debug(`Proxying request: ${href(options)}`); // generate proxy connect message

    let host = `${options.hostname}:${port(options)}`;
    let connectMessage = [`CONNECT ${host} HTTP/1.1`, `Host: ${host}`];

    if (proxy.auth) {
      connectMessage.push(`Proxy-Authorization: ${proxy.auth}`);
    }

    connectMessage = connectMessage.join(CRLF);
    connectMessage += CRLF.repeat(2); // start the proxy connection and setup listeners

    let socket = proxy.connect();

    let handleError = err => {
      socket.destroy(err);
      callback(err);
    };

    let handleClose = () => handleError(new Error('Connection closed while sending request to upstream proxy'));

    let buffer = '';

    let handleData = data => {
      var _buffer$match;

      buffer += data.toString(); // haven't received end of headers yet, keep buffering

      if (!buffer.includes(CRLF.repeat(2))) return; // stop listening after end of headers

      socket.off('data', handleData);

      if (((_buffer$match = buffer.match(STATUS_REG)) === null || _buffer$match === void 0 ? void 0 : _buffer$match[1]) !== '200') {
        return handleError(new Error('Error establishing proxy connection. ' + `Response from server was: ${buffer}`));
      }

      options.socket = socket;
      options.servername = options.hostname; // callback not passed in so not to be added as a listener

      callback(null, super.createConnection(options));
    }; // send and handle the connect message


    socket.on('error', handleError).on('close', handleClose).on('data', handleData).write(connectMessage);
  }

}
export function proxyAgentFor(url, options) {
  let cache = proxyAgentFor.cache || (proxyAgentFor.cache = new Map());
  let {
    protocol,
    hostname
  } = new URL(url);
  let cachekey = `${protocol}//${hostname}`;

  if (!cache.has(cachekey)) {
    cache.set(cachekey, protocol === 'https:' ? new ProxyHttpsAgent(options) : new ProxyHttpAgent(options));
  }

  return cache.get(cachekey);
}