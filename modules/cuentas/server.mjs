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
 * Servidor del módulo cuentas: manifest firmado + estáticos federados.
 * Escucha solo en loopback; Caddy lo expone bajo /modules/cuentas/.
 */

const PORT = Number(process.env.MODULE_PORT ?? 4002);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY =
  process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const MODULE_ID = 'cuentas';

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Cuentas',
  version: pkg.version,
  namespace: 'cuentas',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./UsersPage', './InvitationsPage', './PasswordPage'],
  routes: [
    {
      surface: 'admin',
      path: '/cuentas/usuarios',
      component: './UsersPage',
      // Permisos CONSUMIDOS de la plataforma (declararlos no nos corresponde).
      permissions: ['users.read'],
    },
    {
      surface: 'admin',
      path: '/cuentas/invitaciones',
      component: './InvitationsPage',
      permissions: ['users.read'],
    },
    {
      surface: 'admin',
      path: '/cuentas/password',
      component: './PasswordPage',
      permissions: [],
    },
  ],
  menu: [
    {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Cuentas',
      icon: 'users',
      order: 10,
      // Una sola entrada en el menú principal; sus opciones cuelgan como
      // submenú desplegable.
      mode: 'toggle',
      children: [
        { label: 'Usuarios', path: '/cuentas/usuarios', order: 1 },
        { label: 'Invitaciones', path: '/cuentas/invitaciones', order: 2 },
        { label: 'Mi contraseña', path: '/cuentas/password', order: 3 },
      ],
    },
  ],
  permissions: [],
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
      pathname === '/remoteEntry.js' ? 'no-cache' : 'public, max-age=31536000, immutable',
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
  console.log(`módulo cuentas escuchando en http://127.0.0.1:${PORT}`);
});
