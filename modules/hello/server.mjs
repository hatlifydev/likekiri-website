import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_MODULE,
  HEADER_TIMESTAMP,
  HEADER_SIGNATURE,
} from '@likekiri/contract/hmac';

/**
 * Servidor del módulo hello: sirve el manifest firmado con la clave HMAC
 * propia del módulo y los estáticos del build federado. Escucha solo en
 * loopback; Caddy lo expone bajo /modules/hello/.
 */

const PORT = Number(process.env.HELLO_PORT ?? 4001);
const KEY = process.env.HELLO_HMAC_KEY ?? '';
const REMOTE_ENTRY = process.env.HELLO_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.HELLO_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const MODULE_ID = 'hello';

if (KEY.length < 32) {
  console.error('HELLO_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Hello',
  version: pkg.version,
  namespace: 'hello',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./HelloIsland', './HelloAdminPage'],
  routes: [
    {
      surface: 'web',
      path: '/hello/:slug',
      component: './HelloIsland',
      ssr: 'shell',
      permissions: [],
    },
    {
      surface: 'admin',
      path: '/hello',
      component: './HelloAdminPage',
      permissions: ['hello.read'],
    },
  ],
  menu: [
    { surface: 'admin', slot: 'sidebar', label: 'Hello', icon: 'sparkles', order: 30, path: '/hello' },
  ],
  permissions: [
    { key: 'hello.read', label: 'Ver Hello' },
    { key: 'hello.write', label: 'Editar Hello' },
  ],
};

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serveManifest(req, res) {
  // El core firma su petición; este módulo la verifica antes de responder.
  const verdict = verifySignature({
    key: KEY,
    moduleId: MODULE_ID,
    body: '',
    timestamp: req.headers[HEADER_TIMESTAMP] ?? '',
    signature: req.headers[HEADER_SIGNATURE] ?? '',
  });
  if (req.headers[HEADER_MODULE] !== MODULE_ID || !verdict.ok) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'firma inválida' }));
    return;
  }
  const body = JSON.stringify(manifest);
  // ...y firma su respuesta, para que el core sepa que el manifest es nuestro.
  const headers = buildSignedHeaders(KEY, MODULE_ID, body);
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(DIST, clean);
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    // Los shells viven en otros orígenes (likekiri.com / admin.likekiri.com):
    // los estáticos federados son públicos, CORS abierto.
    'access-control-allow-origin': '*',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const pathname = (req.url ?? '/').split('?')[0];
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  if (pathname === '/.well-known/module-manifest') {
    serveManifest(req, res);
    return;
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"status":"ok"}');
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`módulo hello escuchando en http://127.0.0.1:${PORT}`);
});
