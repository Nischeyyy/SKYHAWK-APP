/**
 * Single-port reverse proxy for Replit.
 * Listens on port 5000 (the only externally exposed port).
 * Routes /api/* and /docs/* to FastAPI backend on port 8000.
 * Routes everything else to Expo web dev server on port 8080.
 */
const http = require('http');

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 8080;
const PROXY_PORT = 5000;

function forward(req, res, targetPort) {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${targetPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    }
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const isApi = url.startsWith('/api') || url.startsWith('/docs') || url.startsWith('/openapi.json');
  forward(req, res, isApi ? BACKEND_PORT : FRONTEND_PORT);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on port ${PROXY_PORT}`);
  console.log(`  /api/* -> backend :${BACKEND_PORT}`);
  console.log(`  /*     -> frontend :${FRONTEND_PORT}`);
});
