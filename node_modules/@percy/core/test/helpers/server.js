// aliased to src during tests
import Server from '../../dist/server.js';

export function createTestServer({ default: defaultReply, ...replies }, port = 8000) {
  let server = new Server();

  // alternate route handling
  let handleReply = reply => async (req, res) => {
    let [status, headers, body] = typeof reply === 'function' ? await reply(req) : reply;
    if (!Buffer.isBuffer(body) && typeof body !== 'string') body = JSON.stringify(body);
    return res.send(status, headers, body);
  };

  // map replies to alternate route handlers
  server.reply = (p, reply) => (replies[p] = handleReply(reply), null);
  for (let [p, reply] of Object.entries(replies)) server.reply(p, reply);
  if (defaultReply) defaultReply = handleReply(defaultReply);

  // track requests and route replies
  server.requests = [];
  server.route(async (req, res, next) => {
    let pathname = req.url.pathname;
    if (req.url.search) pathname += req.url.search;
    server.requests.push(req.body ? [pathname, req.body] : [pathname]);
    let reply = replies[req.url.pathname] || defaultReply;
    return reply ? await reply(req, res) : next();
  });

  // automatically listen
  return server.listen(port);
};

export default createTestServer;
