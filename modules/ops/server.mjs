import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_MODULE,
  HEADER_TIMESTAMP,
  HEADER_SIGNATURE,
} from '@likekiri/contract/hmac';

/**
 * Módulo ops (solo admin): respaldo de base de datos y control de versiones
 * (commit + push a GitHub).
 *
 *  - Backup: el propio proceso ejecuta pg_dump (formato custom -Fc, comprimido)
 *    con DATABASE_URL, sobre 127.0.0.1. Sin privilegios extra.
 *  - Git: el repo canónico vive en /root/likekiri (root). Este servicio corre
 *    como 'likekiri', así que delega en el script root de acción FIJA
 *    /usr/local/bin/likekiri-ops vía sudo restringido (sudoers). Nunca ejecuta
 *    comandos arbitrarios: solo status/commit/push/set-remote.
 */

const PORT = Number(process.env.MODULE_PORT ?? 4010);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY = process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const BACKUP_DIR = resolve(process.env.BACKUP_DIR ?? '/srv/likekiri/backups');
const DATABASE_URL = process.env.DATABASE_URL ?? '';
const CORE_URL = process.env.CORE_INTERNAL_URL ?? 'http://127.0.0.1:3000';
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? 'https://admin.likekiri.com';
const MODULE_ID = 'ops';
const RETENER = 20;

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}
mkdirSync(BACKUP_DIR, { recursive: true });

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 20_000) rejectBody(new Error('cuerpo demasiado grande'));
    });
    req.on('end', () => {
      try {
        resolveBody(data === '' ? {} : JSON.parse(data));
      } catch {
        rejectBody(new Error('JSON inválido'));
      }
    });
    req.on('error', rejectBody);
  });
}
/** execFile con captura; nunca usa shell (sin inyección). */
function run(cmd, args, opts = {}) {
  return new Promise((resolveRun) => {
    execFile(cmd, args, { timeout: 120_000, maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolveRun({ ok: err === null, code: err?.code ?? 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

/** Autorización de admin: delega la sesión en el core y exige el permiso. */
async function auth(req, permiso) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  try {
    const r = await fetch(`${CORE_URL}/api/auth/me`, { headers: { cookie }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const me = await r.json();
    const permisos = Array.isArray(me.permissions) ? me.permissions : [];
    return permisos.includes('*') || permisos.includes(permiso) ? me : null;
  } catch {
    return null;
  }
}

function listarBackups() {
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => {
      const st = statSync(join(BACKUP_DIR, f));
      return { nombre: f, bytes: st.size, creadoEn: st.mtime.toISOString() };
    })
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

async function opsGit(...args) {
  return run('sudo', ['-n', '/usr/local/bin/likekiri-ops', ...args]);
}

function parseStatus(stdout) {
  const out = {};
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return {
    branch: out.branch ?? '?',
    dirty: Number(out.dirty ?? 0),
    remote: out.remote ?? '',
    ahead: Number(out.ahead ?? 0),
    behind: Number(out.behind ?? 0),
    lastDate: out.lastDate ?? null,
    last: out.last ?? '',
  };
}

// ——— API ———
async function handleApi(req, res, pathname) {
  const method = req.method ?? 'GET';
  const mutante = method !== 'GET' && method !== 'HEAD';
  if (mutante && req.headers.origin !== ADMIN_ORIGIN) {
    return sendJson(res, 403, { message: 'origen no permitido' });
  }

  // ——— control de versiones ———
  if (pathname === '/api/git/estado' && method === 'GET') {
    if ((await auth(req, 'ops.read')) === null) return sendJson(res, 401, { message: 'sesión requerida' });
    const r = await opsGit('status');
    if (!r.ok) return sendJson(res, 500, { message: 'no se pudo leer el estado', detalle: r.stderr });
    return sendJson(res, 200, parseStatus(r.stdout));
  }
  if (pathname === '/api/git/commit' && method === 'POST') {
    if ((await auth(req, 'ops.deploy')) === null) return sendJson(res, 401, { message: 'permiso ops.deploy requerido' });
    const body = await readBody(req);
    const msg = String(body.mensaje ?? '').trim().slice(0, 500);
    if (msg === '') return sendJson(res, 400, { message: 'el mensaje de commit es obligatorio' });
    const r = await opsGit('commit', msg);
    if (!r.ok) return sendJson(res, 500, { message: 'commit falló', detalle: r.stderr || r.stdout });
    const salida = r.stdout.trim();
    return sendJson(res, 200, { resultado: salida.startsWith('SIN_CAMBIOS') ? 'sin-cambios' : 'commit', detalle: salida });
  }
  if (pathname === '/api/git/push' && method === 'POST') {
    if ((await auth(req, 'ops.deploy')) === null) return sendJson(res, 401, { message: 'permiso ops.deploy requerido' });
    const r = await opsGit('push');
    if (!r.ok) {
      const sinRemoto = (r.stderr + r.stdout).includes('SIN_REMOTO');
      return sendJson(res, sinRemoto ? 400 : 500, {
        message: sinRemoto ? 'GitHub no está conectado (sin remoto configurado)' : 'push falló',
        detalle: r.stderr || r.stdout,
      });
    }
    return sendJson(res, 200, { detalle: r.stdout.trim() || 'push completado' });
  }

  // ——— respaldo de base de datos ———
  if (pathname === '/api/backups' && method === 'GET') {
    if ((await auth(req, 'ops.read')) === null) return sendJson(res, 401, { message: 'sesión requerida' });
    return sendJson(res, 200, { backups: listarBackups() });
  }
  if (pathname === '/api/backups' && method === 'POST') {
    if ((await auth(req, 'ops.backup')) === null) return sendJson(res, 401, { message: 'permiso ops.backup requerido' });
    if (DATABASE_URL === '') return sendJson(res, 500, { message: 'DATABASE_URL no configurada' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const nombre = `likekiri-${ts}.dump`;
    const destino = join(BACKUP_DIR, nombre);
    // pg_dump formato custom (comprimido, restaurable con pg_restore).
    const r = await run('pg_dump', ['-Fc', '-f', destino, DATABASE_URL]);
    if (!r.ok) {
      try { unlinkSync(destino); } catch {}
      return sendJson(res, 500, { message: 'pg_dump falló', detalle: r.stderr });
    }
    // Retención: conservar los RETENER más recientes.
    const todos = listarBackups();
    for (const viejo of todos.slice(RETENER)) {
      try { unlinkSync(join(BACKUP_DIR, viejo.nombre)); } catch {}
    }
    const creado = listarBackups().find((b) => b.nombre === nombre);
    return sendJson(res, 200, { backup: creado });
  }
  const desc = pathname.match(/^\/api\/backups\/(likekiri-[0-9TZ.\-]+\.dump)$/);
  if (desc !== null && method === 'GET') {
    if ((await auth(req, 'ops.backup')) === null) return sendJson(res, 401, { message: 'permiso ops.backup requerido' });
    const file = join(BACKUP_DIR, desc[1]);
    if (!file.startsWith(BACKUP_DIR) || !existsSync(file)) return sendJson(res, 404, { message: 'no existe' });
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${desc[1]}"`,
    });
    createReadStream(file).pipe(res);
    return;
  }

  return sendJson(res, 404, { message: 'no existe' });
}

// ——— manifest + estáticos ———
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Operaciones',
  version: pkg.version,
  namespace: 'ops',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./OpsAdminPage'],
  routes: [{ surface: 'admin', path: '/ops', component: './OpsAdminPage', permissions: ['ops.read'] }],
  menu: [{ surface: 'admin', slot: 'sidebar', label: 'Operaciones', icon: 'server', order: 90, path: '/ops' }],
  permissions: [
    { key: 'ops.read', label: 'Ver operaciones (estado y respaldos)' },
    { key: 'ops.backup', label: 'Crear y descargar respaldos de base de datos' },
    { key: 'ops.deploy', label: 'Commit y push del código a GitHub' },
  ],
};
const MIME = {
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
};
function serveManifest(req, res) {
  const verdict = verifySignature({
    key: KEY, moduleId: MODULE_ID, body: '',
    timestamp: req.headers[HEADER_TIMESTAMP] ?? '', signature: req.headers[HEADER_SIGNATURE] ?? '',
  });
  if (req.headers[HEADER_MODULE] !== MODULE_ID || !verdict.ok) return sendJson(res, 401, { error: 'firma inválida' });
  const body = JSON.stringify(manifest);
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...buildSignedHeaders(KEY, MODULE_ID, body) });
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
    'cache-control': pathname === '/remoteEntry.js' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const pathname = (req.url ?? '/').split('?')[0];
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((error) => {
      console.error('error en la API:', error);
      if (!res.headersSent) sendJson(res, 500, { message: 'error interno' });
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  if (pathname === '/.well-known/module-manifest') { serveManifest(req, res); return; }
  if (pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"status":"ok"}'); return; }
  serveStatic(req, res, pathname);
});
server.listen(PORT, '127.0.0.1', () => console.log(`módulo ops escuchando en http://127.0.0.1:${PORT}`));
