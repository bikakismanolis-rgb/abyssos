// static server for the built artifact with a strict CSP (no blob: in connect-src), to mimic a sandboxed host
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, root, port, csp] = process.argv;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Security-Policy': csp });
  fs.createReadStream(f).pipe(res);
}).listen(+port);
