const utils = require('@percy/sdk-utils');

function stub(object, method, func) {
  if (object[method].restore) object[method].restore();

  let stub = object[method] = Object.assign(function stub(...args) {
    stub.calls.push(args);
    if (func) return func.apply(this, args);
  }, {
    restore: () => (object[method] = stub.originalValue),
    reset: () => (stub.calls.length = 0) || stub,
    originalValue: object[method],
    calls: []
  });

  return stub;
}

// matches ansi escape sequences
const ANSI_REG = new RegExp((
  '[\\u001B\\u009B][[\\]()#;?]*((?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)' +
  '|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
), 'g');

// strips a log message of excessive newlines and asni escape sequences
function sanitizeLog(str) {
  return str.replace(/\r\n/g, '\n')
    .replace(ANSI_REG, '')
    .replace(/\n$/, '');
}

const helpers = {
  async setup() {
    utils.percy.version = '';
    delete utils.percy.config;
    delete utils.percy.enabled;
    delete utils.percy.domScript;
    delete process.env.PERCY_SERVER_ADDRESS;
    await helpers.call('server.mock');
    await helpers.logger.mock();
  },

  async teardown() {
    utils.logger.log.restore?.();

    if (process.env.__PERCY_BROWSERIFIED__) {
      for (let m of ['warn', 'error', 'log']) console[m].restore?.();
    } else {
      for (let io of ['stdout', 'stderr']) process[io].write.restore?.();
    }

    return helpers.call('server.close');
  },

  getRequests: () => helpers.call('server.requests'),
  testReply: (path, reply) => helpers.call('server.reply', path, reply),
  testFailure: (...args) => helpers.call('server.test.failure', ...args),
  testError: path => helpers.call('server.test.error', path),
  testSerialize: fn => !fn
    ? helpers.call('server.test.serialize') // get
    : helpers.call('server.test.serialize', fn), // set
  mockSite: () => helpers.call('site.mock'),
  closeSite: () => helpers.call('site.close'),

  logger: {
    stdout: [],
    stderr: [],
    loglevel: utils.logger.loglevel,

    async mock() {
      helpers.logger.reset();

      let shouldCaptureLogs = false;

      stub(utils.logger, 'log', (...args) => {
        shouldCaptureLogs = true;
        utils.logger.log.originalValue(...args);
        shouldCaptureLogs = false;
      });

      let stubLogs = (ctx, method, err) => stub(ctx, method, msg => {
        if (!shouldCaptureLogs) return ctx[method].originalValue.call(ctx, msg);
        else helpers.logger[err ? 'stderr' : 'stdout'].push(sanitizeLog(msg));
      });

      if (process.env.__PERCY_BROWSERIFIED__) {
        for (let m of ['warn', 'error', 'log']) stubLogs(console, m, m !== 'log');
      } else {
        for (let io of ['stdout', 'stderr']) stubLogs(process[io], 'write', io === 'stderr');
      }
    },

    reset() {
      utils.logger.remote.socket?.close();
      delete utils.logger.loglevel.lvl;
      delete utils.logger.log.history;

      helpers.logger.stdout.length = 0;
      helpers.logger.stderr.length = 0;
      utils.logger.log.reset?.();

      if (process.env.__PERCY_BROWSERIFIED__) {
        for (let m of ['warn', 'error', 'log']) console[m].reset?.();
      } else {
        for (let io of ['stdout', 'stderr']) process[io].write.reset?.();
      }
    }
  }
};

if (process.env.__PERCY_BROWSERIFIED__) {
  helpers.call = async function call(event, ...args) {
    let { socket, pending = {} } = helpers.call;

    if (!socket) {
      socket = new window.WebSocket('ws://localhost:5339');

      await new Promise((resolve, reject) => {
        let done = event => {
          clearTimeout(timeoutid);
          socket.onopen = socket.onerror = null;
          if (event && (event.error || event.type === 'error')) {
            reject(event.error || new Error('Test client connection failed'));
          } else resolve(socket);
        };

        let timeoutid = setTimeout(done, 1000, {
          error: new Error('Test client connection timed out')
        });

        socket.onopen = socket.onerror = done;
      });

      socket.onmessage = ({ data }) => {
        let { id, resolve, reject } = JSON.parse(data);
        if (!pending[id]) return;
        if (resolve) pending[id].resolve(resolve.result);
        if (reject) pending[id].reject(reject.error);
      };

      Object.assign(helpers.call, { socket, pending });
    }

    let id = helpers.call.uid = (helpers.call.uid || 0) + 1;
    args = args.map(a => typeof a === 'function' ? a.toString() : a);
    socket.send(JSON.stringify({ id, event, args }));

    return ((pending[id] = {}).promise = (
      new Promise((resolve, reject) => {
        Object.assign(pending[id], { resolve, reject });
      })
    ));
  };
} else {
  helpers.call = async function call() {
    let { context } = await import('./server.js');
    helpers.context = (helpers.context || await context());
    return helpers.context.call(...arguments);
  };
}

module.exports = helpers;
