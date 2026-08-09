import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_MODULE,
  HEADER_TIMESTAMP,
  HEADER_SIGNATURE,
} from '@likekiri/contract/hmac';

/**
 * Módulo clientes: el ejemplo de módulo con DOMINIO PROPIO.
 *
 * Este server no solo publica manifest y estáticos: también expone la API del
 * dominio (cuentas de cliente, planes, facturación) con su propio
 * almacenamiento (SQLite embebido). El core jamás conoce este dominio.
 *
 * Cómo habla el front con el admin: ambos hablan con ESTA API, por el mismo
 * path relativo (/modules/clientes/api/...) proxied por Caddy en cada origen.
 *  - El front (likekiri.com) usa la sesión de CLIENTE, propia del módulo.
 *  - El admin (admin.likekiri.com) usa la sesión de ADMINISTRADOR del core:
 *    este server la valida delegando en el core (GET /api/auth/me) y exige
 *    los permisos del módulo (clientes.read / clientes.write).
 */

const PORT = Number(process.env.MODULE_PORT ?? 4006);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY =
  process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const DATA_DIR = resolve(process.env.MODULE_DATA_DIR ?? new URL('./data', import.meta.url).pathname);
const CORE_URL = process.env.CORE_INTERNAL_URL ?? 'http://127.0.0.1:3000';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? 'https://likekiri.com';
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? 'https://admin.likekiri.com';
const MODULE_ID = 'clientes';
const SESSION_COOKIE = '__Host-lk_clientes';
const SESSION_TTL_MS = 30 * 24 * 3_600_000;

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

// ——— almacenamiento propio del módulo ———
mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'clientes.sqlite'));
db.exec(`
  create table if not exists cuentas (
    id text primary key,
    nombre text not null,
    email text not null unique,
    passwordHash text not null,
    plan text not null,
    activo integer not null default 1,
    creadaEn text not null
  );
  create table if not exists sesiones (
    id text primary key,
    cuentaId text not null,
    tokenHash text not null unique,
    expiraEn integer not null
  );
  create table if not exists facturas (
    id text primary key,
    cuentaId text not null,
    fecha text not null,
    concepto text not null,
    monto integer not null,
    estado text not null
  );
`);

const PLANES = {
  gratis: { nombre: 'Gratis', precio: 0 },
  profesional: { nombre: 'Profesional', precio: 29_990 },
  empresa: { nombre: 'Empresa', precio: 189_990 },
};

// ——— helpers ———
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(stored, password) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function readCookie(header, name) {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000) rejectBody(new Error('cuerpo demasiado grande'));
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

/** CSRF: los POST deben venir del origen esperado. */
function originOk(req, expected) {
  return req.headers.origin === expected;
}

function sessionCookie(token, maxAgeSeconds) {
  return (
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; ` +
    `Max-Age=${maxAgeSeconds}`
  );
}

function crearSesionCliente(cuentaId) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('insert into sesiones (id, cuentaId, tokenHash, expiraEn) values (?, ?, ?, ?)').run(
    randomUUID(),
    cuentaId,
    sha256(token),
    Date.now() + SESSION_TTL_MS,
  );
  return token;
}

function cuentaDeSesion(req) {
  const token = readCookie(req.headers.cookie, SESSION_COOKIE);
  if (token === null) return null;
  const fila = db
    .prepare(
      `select c.* from sesiones s join cuentas c on c.id = s.cuentaId
       where s.tokenHash = ? and s.expiraEn > ? and c.activo = 1`,
    )
    .get(sha256(token), Date.now());
  return fila ?? null;
}

function crearFactura(cuentaId, concepto, monto) {
  db.prepare(
    'insert into facturas (id, cuentaId, fecha, concepto, monto, estado) values (?, ?, ?, ?, ?, ?)',
  ).run(randomUUID(), cuentaId, new Date().toISOString(), concepto, monto, monto === 0 ? 'pagada' : 'pendiente');
}

const publicarCuenta = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  email: fila.email,
  plan: fila.plan,
  activo: fila.activo === 1,
  creadaEn: fila.creadaEn,
});

const facturasDe = (cuentaId) =>
  db
    .prepare('select id, fecha, concepto, monto, estado from facturas where cuentaId = ? order by fecha desc')
    .all(cuentaId);

/**
 * Autorización de administradores: el módulo NO tiene su propia noción de
 * admin. Reenvía la cookie de la sesión admin al core y exige el permiso.
 */
async function adminAuth(req, permiso) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  try {
    const response = await fetch(`${CORE_URL}/api/auth/me`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const me = await response.json();
    const permisos = Array.isArray(me.permissions) ? me.permissions : [];
    return permisos.includes('*') || permisos.includes(permiso) ? me : null;
  } catch {
    return null;
  }
}

// ——— API del dominio ———
async function handleApi(req, res, pathname) {
  const method = req.method ?? 'GET';

  // ——— superficie pública (sesión de cliente) ———
  if (pathname === '/api/registro' && method === 'POST') {
    if (!originOk(req, PUBLIC_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    const body = await readBody(req);
    const nombre = String(body.nombre ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const plan = String(body.plan ?? '');
    if (nombre.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(plan in PLANES)) {
      return sendJson(res, 400, { message: 'datos inválidos' });
    }
    if (password.length < 12) {
      return sendJson(res, 400, { message: 'la contraseña debe tener al menos 12 caracteres' });
    }
    const id = randomUUID();
    try {
      db.prepare(
        'insert into cuentas (id, nombre, email, passwordHash, plan, activo, creadaEn) values (?, ?, ?, ?, ?, 1, ?)',
      ).run(id, nombre, email, hashPassword(password), plan, new Date().toISOString());
    } catch {
      // email duplicado u otro fallo: mensaje genérico, no filtra existencia
      return sendJson(res, 400, { message: 'no se pudo crear la cuenta' });
    }
    crearFactura(id, `Alta plan ${PLANES[plan].nombre}`, PLANES[plan].precio);
    const token = crearSesionCliente(id);
    return sendJson(res, 200, { ok: true }, { 'set-cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  if (pathname === '/api/acceso' && method === 'POST') {
    if (!originOk(req, PUBLIC_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const fila = db.prepare('select * from cuentas where email = ?').get(email);
    // Verificación de sacrificio si no existe: tiempo de respuesta parejo.
    const valido = fila
      ? verifyPassword(fila.passwordHash, password)
      : (verifyPassword('00:00', password), false);
    if (!valido || fila.activo !== 1) {
      return sendJson(res, 401, { message: 'correo o contraseña incorrectos' });
    }
    const token = crearSesionCliente(fila.id);
    return sendJson(res, 200, { ok: true }, { 'set-cookie': sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  if (pathname === '/api/salir' && method === 'POST') {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (token !== null) db.prepare('delete from sesiones where tokenHash = ?').run(sha256(token));
    return sendJson(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
  }

  if (pathname === '/api/mi-cuenta' && method === 'GET') {
    const cuenta = cuentaDeSesion(req);
    if (cuenta === null) return sendJson(res, 401, { message: 'sesión requerida' });
    return sendJson(res, 200, { cuenta: publicarCuenta(cuenta), facturas: facturasDe(cuenta.id) });
  }

  if (pathname === '/api/cambiar-plan' && method === 'POST') {
    if (!originOk(req, PUBLIC_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    const cuenta = cuentaDeSesion(req);
    if (cuenta === null) return sendJson(res, 401, { message: 'sesión requerida' });
    const body = await readBody(req);
    const plan = String(body.plan ?? '');
    if (!(plan in PLANES) || plan === cuenta.plan) {
      return sendJson(res, 400, { message: 'plan inválido' });
    }
    db.prepare('update cuentas set plan = ? where id = ?').run(plan, cuenta.id);
    crearFactura(cuenta.id, `Cambio a plan ${PLANES[plan].nombre}`, PLANES[plan].precio);
    const actualizada = db.prepare('select * from cuentas where id = ?').get(cuenta.id);
    return sendJson(res, 200, { cuenta: publicarCuenta(actualizada), facturas: facturasDe(cuenta.id) });
  }

  // ——— superficie de administración (sesión admin validada contra el core) ———
  if (pathname === '/api/admin/cuentas' && method === 'GET') {
    if ((await adminAuth(req, 'clientes.read')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const cuentas = db.prepare('select * from cuentas order by creadaEn desc').all();
    return sendJson(
      res,
      200,
      cuentas.map((fila) => {
        const facturas = facturasDe(fila.id);
        return {
          ...publicarCuenta(fila),
          facturas: facturas.length,
          pendiente: facturas
            .filter((f) => f.estado === 'pendiente')
            .reduce((sum, f) => sum + f.monto, 0),
        };
      }),
    );
  }

  if (pathname === '/api/admin/facturas' && method === 'GET') {
    if ((await adminAuth(req, 'clientes.read')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const facturas = db
      .prepare(
        `select f.id, f.fecha, f.concepto, f.monto, f.estado, c.email
         from facturas f join cuentas c on c.id = f.cuentaId order by f.fecha desc`,
      )
      .all();
    return sendJson(res, 200, facturas);
  }

  const planMatch = pathname.match(/^\/api\/admin\/cuentas\/([0-9a-f-]{36})\/plan$/);
  if (planMatch !== null && method === 'POST') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const body = await readBody(req);
    const plan = String(body.plan ?? '');
    const cuenta = db.prepare('select * from cuentas where id = ?').get(planMatch[1]);
    if (cuenta === undefined || !(plan in PLANES)) {
      return sendJson(res, 400, { message: 'petición inválida' });
    }
    if (plan !== cuenta.plan) {
      db.prepare('update cuentas set plan = ? where id = ?').run(plan, cuenta.id);
      crearFactura(cuenta.id, `Cambio a plan ${PLANES[plan].nombre} (administración)`, PLANES[plan].precio);
    }
    return sendJson(res, 200, { ok: true });
  }

  const estadoMatch = pathname.match(/^\/api\/admin\/cuentas\/([0-9a-f-]{36})\/estado$/);
  if (estadoMatch !== null && method === 'POST') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const body = await readBody(req);
    const activo = body.activo === true ? 1 : 0;
    db.prepare('update cuentas set activo = ? where id = ?').run(activo, estadoMatch[1]);
    if (activo === 0) {
      // Suspender revoca las sesiones de cliente de esa cuenta.
      db.prepare('delete from sesiones where cuentaId = ?').run(estadoMatch[1]);
    }
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { message: 'no existe' });
}

// ——— manifest + estáticos (igual que cualquier módulo) ———
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Clientes',
  version: pkg.version,
  namespace: 'clientes',
  remoteEntry: REMOTE_ENTRY,
  exposes: [
    './RegistroIsland',
    './AccesoIsland',
    './PortalIsland',
    './CuentasAdminPage',
    './FacturacionAdminPage',
  ],
  routes: [
    { surface: 'web', path: '/clientes/registro', component: './RegistroIsland', ssr: 'shell', permissions: [] },
    { surface: 'web', path: '/clientes/acceso', component: './AccesoIsland', ssr: 'shell', permissions: [] },
    { surface: 'web', path: '/clientes/portal', component: './PortalIsland', ssr: 'shell', permissions: [] },
    { surface: 'admin', path: '/clientes', component: './CuentasAdminPage', permissions: ['clientes.read'] },
    { surface: 'admin', path: '/clientes/facturacion', component: './FacturacionAdminPage', permissions: ['clientes.read'] },
  ],
  menu: [
    {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Clientes',
      icon: 'briefcase',
      order: 15,
      mode: 'toggle',
      children: [
        { label: 'Cuentas', path: '/clientes', order: 1 },
        { label: 'Facturación', path: '/clientes/facturacion', order: 2 },
      ],
    },
  ],
  permissions: [
    { key: 'clientes.read', label: 'Ver cuentas de cliente y facturación' },
    { key: 'clientes.write', label: 'Modificar cuentas de cliente' },
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
  const verdict = verifySignature({
    key: KEY,
    moduleId: MODULE_ID,
    body: '',
    timestamp: req.headers[HEADER_TIMESTAMP] ?? '',
    signature: req.headers[HEADER_SIGNATURE] ?? '',
  });
  if (req.headers[HEADER_MODULE] !== MODULE_ID || !verdict.ok) {
    return sendJson(res, 401, { error: 'firma inválida' });
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
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((error) => {
      console.error('error en la API:', error);
      if (!res.headersSent) sendJson(res, 500, { message: 'error interno' });
    });
    return;
  }
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
  console.log(`módulo clientes escuchando en http://127.0.0.1:${PORT}`);
});
