/**
 * Simple static file server for the built manager portal.
 * Serves dist/ at /manager/ with SPA fallback routing.
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8081;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
};

http.createServer((req, res) => {
  // Strip /manager prefix to get the file path within dist/
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/manager')) {
    urlPath = urlPath.slice('/manager'.length) || '/';
  }

  // Try the exact file first, then SPA fallback to index.html
  let filePath = path.join(DIST, urlPath);

  function tryFile(fp, fallback) {
    fs.stat(fp, (err, stat) => {
      if (!err && stat.isFile()) {
        const ext  = path.extname(fp).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type':  mime,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
        });
        fs.createReadStream(fp).pipe(res);
      } else if (fallback) {
        // SPA fallback: serve index.html
        tryFile(path.join(DIST, 'index.html'), false);
      } else {
        res.writeHead(404); res.end('Not found');
      }
    });
  }

  // If path ends with / or has no extension, try index.html inside it, then SPA fallback
  if (urlPath.endsWith('/') || !path.extname(urlPath)) {
    tryFile(path.join(filePath, 'index.html'), true);
  } else {
    tryFile(filePath, true);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Manager Portal static server on port ${PORT}`);
  console.log(`Serving: ${DIST}`);
});
