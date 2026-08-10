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
 * PLANTILLA de servidor de módulo (superficie admin).
 * Verifica la firma del core, responde el manifest firmado y sirve dist/.
 * Escucha SOLO en loopback.
 */

const PORT = Number(process.env.MODULE_PORT ?? 4005);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY =
  process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const MODULE_ID = 'ejemplo-admin';

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Ejemplo Admin',
  version: pkg.version,
  namespace: 'ejemplo-admin',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./PanelPage', './AjustesPage'],
  routes: [
    {
      surface: 'admin',
      path: '/ejemplo-admin',
      component: './PanelPage',
      permissions: ['ejemplo-admin.read'],
    },
    {
      surface: 'admin',
      path: '/ejemplo-admin/ajustes',
      component: './AjustesPage',
      permissions: ['ejemplo-admin.read'],
    },
  ],
  menu: [
    {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Ejemplo',
      icon: 'beaker',
      order: 30,
      // Submenú plegable: una sola entrada en el menú principal.
      mode: 'toggle',
      children: [
        { label: 'Panel', path: '/ejemplo-admin', order: 1 },
        { label: 'Ajustes', path: '/ejemplo-admin/ajustes', order: 2 },
      ],
    },
  ],
  // Permiso DECLARADO en nuestro namespace. El superadmin lo tiene vía
  // comodín; a otros roles se les asigna desde la administración de roles.
  permissions: [{ key: 'ejemplo-admin.read', label: 'Ver el módulo de ejemplo' }],
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
    'access-control-allow-origin': '*',
    'cache-control':
      'no-cache',
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
  console.log(`módulo ejemplo-admin escuchando en http://127.0.0.1:${PORT}`);
});
