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

// Migración aditiva: cuentas antiguas quedan como 'persona'.
{
  const columnas = db.prepare('pragma table_info(cuentas)').all();
  if (!columnas.some((col) => col.name === 'tipo')) {
    db.exec("alter table cuentas add column tipo text not null default 'persona'");
  }
  // Campos de producto/facturación (aditivos; el portal legacy queda con producto NULL).
  const colsCuentas = db.prepare('pragma table_info(cuentas)').all().map((c) => c.name);
  if (!colsCuentas.includes('producto')) db.exec('alter table cuentas add column producto text');
  if (!colsCuentas.includes('cicloFacturacion')) db.exec('alter table cuentas add column cicloFacturacion text');
  if (!colsCuentas.includes('inicioVigencia')) db.exec('alter table cuentas add column inicioVigencia text');
  if (!colsCuentas.includes('finVigencia')) db.exec('alter table cuentas add column finVigencia text');
  if (!colsCuentas.includes('firebaseUid')) db.exec('alter table cuentas add column firebaseUid text');
}

// ——— productos (subcategorías) y su clave de integración por app externa ———
db.exec(`
  create table if not exists productos (
    slug text primary key,
    nombre text not null,
    planes text not null,              -- JSON: [{ key, nombre }]
    apiKey text not null,              -- clave visible (para copiar a la app externa)
    origenesPermitidos text not null,  -- JSON: ["https://askmypast.com"]
    creadaEn text not null
  );
`);
{
  // Aditivo: auto-alta como free al consultar vigencia (sync con Firebase, etc.).
  const colsProd = db.prepare('pragma table_info(productos)').all().map((c) => c.name);
  if (!colsProd.includes('autoAltaFree')) db.exec('alter table productos add column autoAltaFree integer not null default 0');
}

/** Ciclos de facturación → meses a sumar (lifetime = sin vencimiento). */
const CICLOS = { mensual: 1, trimestral: 3, anual: 12, bianual: 24, lifetime: null };

function generarApiKey(slug) {
  return `lk_${slug}_${randomBytes(24).toString('base64url')}`;
}

// Semilla de los 3 productos actuales (idempotente).
const PRODUCTOS_SEED = [
  {
    slug: 'askmypast',
    nombre: 'AskMyPast',
    planes: [
      { key: 'free', nombre: 'Free' },
      { key: 'premium', nombre: 'Premium' },
      { key: 'onpremise', nombre: 'On-premise' },
    ],
    origenes: ['https://askmypast.com'],
  },
  {
    slug: 'wordpress',
    nombre: 'WordPress',
    planes: [
      { key: 'basico', nombre: 'Básico' },
      { key: 'pro', nombre: 'Pro' },
      { key: 'empresa', nombre: 'Empresa' },
    ],
    origenes: [],
  },
  {
    slug: 'chatmanager',
    nombre: 'ChatManager',
    planes: [
      { key: 'free', nombre: 'Free' },
      { key: 'premium', nombre: 'Premium' },
    ],
    origenes: [],
  },
];
for (const p of PRODUCTOS_SEED) {
  if (!db.prepare('select slug from productos where slug = ?').get(p.slug)) {
    db.prepare(
      'insert into productos (slug, nombre, planes, apiKey, origenesPermitidos, creadaEn) values (?, ?, ?, ?, ?, ?)',
    ).run(p.slug, p.nombre, JSON.stringify(p.planes), generarApiKey(p.slug), JSON.stringify(p.origenes), new Date().toISOString());
  }
}

// ——— catálogo GLOBAL de planes (generador) + asociación a productos ———
db.exec(`
  create table if not exists planes_catalogo (
    id text primary key,
    clave text not null unique,          -- p. ej. 'premium' (lo que guarda cuentas.plan)
    nombre text not null,
    precio integer not null default 0,
    features text not null default '[]',           -- JSON: string[]
    ciclosPermitidos text not null default '[]',   -- JSON: ciclo[]
    activo integer not null default 1,
    creadaEn text not null
  );
  create table if not exists producto_planes (
    productoSlug text not null,
    planId text not null,
    primary key (productoSlug, planId)
  );
`);

// Semilla del catálogo desde los planes por producto (deduplicados por clave), 1ª vez.
if (db.prepare('select count(*) c from planes_catalogo').get().c === 0) {
  const todosCiclos = Object.keys(CICLOS);
  const idPorClave = new Map();
  for (const p of PRODUCTOS_SEED) {
    for (const pl of p.planes) {
      if (!idPorClave.has(pl.key)) {
        const id = randomUUID();
        idPorClave.set(pl.key, id);
        db.prepare(
          'insert into planes_catalogo (id, clave, nombre, precio, features, ciclosPermitidos, activo, creadaEn) values (?, ?, ?, 0, ?, ?, 1, ?)',
        ).run(id, pl.key, pl.nombre, JSON.stringify([]), JSON.stringify(todosCiclos), new Date().toISOString());
      }
      db.prepare('insert or ignore into producto_planes (productoSlug, planId) values (?, ?)').run(p.slug, idPorClave.get(pl.key));
    }
  }
}

const TIPOS = new Set(['persona', 'empresa']);

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

const publicarPlan = (r) => ({
  id: r.id,
  clave: r.clave,
  nombre: r.nombre,
  precio: r.precio,
  features: JSON.parse(r.features),
  ciclosPermitidos: JSON.parse(r.ciclosPermitidos),
  activo: r.activo === 1,
});

/** Planes del catálogo asociados a un producto (opcionalmente solo activos). */
function planesDeProducto(slug, soloActivos = false) {
  const rows = db
    .prepare(
      `select pc.* from producto_planes pp join planes_catalogo pc on pc.id = pp.planId
       where pp.productoSlug = ? ${soloActivos ? 'and pc.activo = 1' : ''}
       order by pc.precio, pc.nombre`,
    )
    .all(slug);
  return rows.map(publicarPlan);
}

function getProducto(slug) {
  const fila = db.prepare('select * from productos where slug = ?').get(slug);
  if (!fila) return null;
  return {
    slug: fila.slug,
    nombre: fila.nombre,
    planes: planesDeProducto(slug, true),
    apiKey: fila.apiKey,
    origenesPermitidos: JSON.parse(fila.origenesPermitidos),
    autoAltaFree: fila.autoAltaFree === 1,
    creadaEn: fila.creadaEn,
  };
}

/**
 * Upsert de un cliente de producto por (producto, firebaseUid) o (producto, email).
 * Usado por la sincronización con Firebase (auto-alta JIT, push on-signup, backfill).
 * Sin plan → free/lifetime (siempre vigente). No pisa datos con vacíos.
 */
function upsertCliente(prodSlug, { email, uid, nombre, plan, ciclo, inicio }) {
  const em = String(email ?? '').trim().toLowerCase();
  const fbUid = uid ? String(uid) : null;
  const planes = planesDeProducto(prodSlug, true);
  let row = null;
  if (fbUid) row = db.prepare('select * from cuentas where producto = ? and firebaseUid = ?').get(prodSlug, fbUid);
  if (!row && em) row = db.prepare('select * from cuentas where producto = ? and email = ?').get(prodSlug, em);

  const planValido = plan && planes.some((p) => p.clave === plan) ? plan : null;
  const planFinal = planValido ?? (row ? row.plan : 'free');
  const cicloFinal = ciclo && ciclo in CICLOS ? ciclo : row?.cicloFacturacion ?? 'lifetime';
  const inicioFinal = inicio || row?.inicioVigencia || new Date().toISOString();
  const fin = calcularFinVigencia(inicioFinal, cicloFinal);
  const nom = String(nombre ?? '').trim();

  if (row) {
    db.prepare(
      `update cuentas set email = ?, nombre = case when ? <> '' then ? else nombre end,
       firebaseUid = coalesce(?, firebaseUid), plan = ?, cicloFacturacion = ?, inicioVigencia = ?, finVigencia = ? where id = ?`,
    ).run(em || row.email, nom, nom, fbUid, planFinal, cicloFinal, inicioFinal, fin, row.id);
    return db.prepare('select * from cuentas where id = ?').get(row.id);
  }
  const id = randomUUID();
  db.prepare(
    `insert into cuentas (id, nombre, email, passwordHash, plan, tipo, activo, creadaEn, producto, cicloFacturacion, inicioVigencia, finVigencia, firebaseUid)
     values (?, ?, ?, '', ?, 'empresa', 1, ?, ?, ?, ?, ?, ?)`,
  ).run(id, nom, em, planFinal, new Date().toISOString(), prodSlug, cicloFinal, inicioFinal, fin, fbUid);
  return db.prepare('select * from cuentas where id = ?').get(id);
}

/** Arma la respuesta de vigencia (planEfectivo, premium, onpremise, features). */
function respuestaEntitlement(prodSlug, fila, email) {
  if (!fila) {
    return { producto: prodSlug, email, encontrado: false, vigente: false, plan: null, planEfectivo: 'free', premium: false, onpremise: false, features: featuresDePlan('free') };
  }
  const vig = esVigente(fila);
  const planEfectivo = vig ? fila.plan : 'free';
  return {
    producto: prodSlug,
    email: fila.email,
    uid: fila.firebaseUid ?? null,
    encontrado: true,
    vigente: vig,
    plan: fila.plan,
    planEfectivo,
    premium: planEfectivo === 'premium' || planEfectivo === 'onpremise',
    onpremise: planEfectivo === 'onpremise',
    features: featuresDePlan(planEfectivo),
    cicloFacturacion: fila.cicloFacturacion ?? null,
    inicioVigencia: fila.inicioVigencia ?? null,
    finVigencia: fila.finVigencia ?? null,
  };
}

/** Suma los meses del ciclo al inicio; lifetime o dato inválido → sin vencimiento. */
function calcularFinVigencia(inicioISO, ciclo) {
  const meses = CICLOS[ciclo];
  if (meses == null) return null; // lifetime
  const d = new Date(inicioISO);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + meses);
  return d.toISOString();
}

/** Vigente = activa y (lifetime/sin fin, o el fin no pasó). */
function esVigente(fila) {
  if (fila.activo !== 1) return false;
  if (!fila.finVigencia) return true;
  return new Date(fila.finVigencia).getTime() >= Date.now();
}

/** ¿El origen está permitido por algún producto? (para el preflight CORS). */
function origenPermitidoGlobal(origen) {
  const filas = db.prepare('select origenesPermitidos from productos').all();
  return filas.some((f) => JSON.parse(f.origenesPermitidos).includes(origen));
}

/** Features del plan (por clave) desde el catálogo, si el plan está activo. */
function featuresDePlan(clave) {
  const r = db.prepare('select features from planes_catalogo where clave = ? and activo = 1').get(clave);
  return r ? JSON.parse(r.features) : [];
}

const publicarCuenta = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  email: fila.email,
  plan: fila.plan,
  tipo: fila.tipo ?? 'persona',
  activo: fila.activo === 1,
  creadaEn: fila.creadaEn,
  producto: fila.producto ?? null,
  cicloFacturacion: fila.cicloFacturacion ?? null,
  inicioVigencia: fila.inicioVigencia ?? null,
  finVigencia: fila.finVigencia ?? null,
  firebaseUid: fila.firebaseUid ?? null,
  vigente: esVigente(fila),
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

// ——— SSR delegado (ssr: 'server') ———
let ssrRender = null;
try {
  const entry = await import(new URL('./dist-ssr/entry-ssr.js', import.meta.url).href);
  ssrRender = entry.render;
} catch (error) {
  console.warn('sin bundle SSR (dist-ssr); las islas degradarán a shell:', String(error));
}

function readRawBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 50_000) rejectBody(new Error('cuerpo demasiado grande'));
    });
    req.on('end', () => resolveBody(data));
    req.on('error', rejectBody);
  });
}

/** El core firma la petición con la clave de ESTE módulo; se verifica. */
async function handleRender(req, res) {
  const body = await readRawBody(req);
  const verdict = verifySignature({
    key: KEY,
    moduleId: MODULE_ID,
    body,
    timestamp: req.headers[HEADER_TIMESTAMP] ?? '',
    signature: req.headers[HEADER_SIGNATURE] ?? '',
  });
  if (req.headers[HEADER_MODULE] !== MODULE_ID || !verdict.ok) {
    return sendJson(res, 401, { message: 'firma inválida' });
  }
  if (ssrRender === null) {
    return sendJson(res, 503, { message: 'SSR no disponible' });
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { message: 'JSON inválido' });
  }
  const component = String(payload.component ?? '');
  const props = payload.props && typeof payload.props === 'object' ? payload.props : {};
  try {
    const html = ssrRender(component, props);
    if (html === null) return sendJson(res, 404, { message: 'componente desconocido' });
    return sendJson(res, 200, { html });
  } catch (error) {
    console.error('fallo en renderToString:', error);
    return sendJson(res, 500, { message: 'error de render' });
  }
}

// ——— API del dominio ———
async function handleApi(req, res, pathname) {
  const method = req.method ?? 'GET';

  // ——— consulta de VIGENCIA para apps externas (askmypast, etc.) ———
  // Auth: apikey del producto (x-api-key o Bearer) + restricción de origen.
  // Si la app llama server-to-server (sin Origin), basta la apikey secreta.
  if (pathname === '/api/entitlement') {
    const origen = req.headers.origin ?? null;
    if (method === 'OPTIONS') {
      // Preflight CORS: la apikey no viaja aún, así que autorizamos por origen global.
      if (origen && origenPermitidoGlobal(origen)) {
        res.writeHead(204, {
          'access-control-allow-origin': origen,
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'x-api-key, authorization',
          'access-control-max-age': '600',
          vary: 'Origin',
        });
        return res.end();
      }
      return sendJson(res, 403, { message: 'origen no permitido' });
    }
    if (method !== 'GET') return sendJson(res, 405, { message: 'método no permitido' });

    const key = String(req.headers['x-api-key'] ?? String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
    if (!key) return sendJson(res, 401, { message: 'apikey requerida' });
    const prod = db.prepare('select * from productos where apiKey = ?').get(key);
    if (!prod) return sendJson(res, 401, { message: 'apikey inválida' });
    const origenes = JSON.parse(prod.origenesPermitidos);
    // Si el request declara origen (navegador), debe estar permitido para ese producto.
    const refererOrigen = (() => {
      try {
        return req.headers.referer ? new URL(req.headers.referer).origin : null;
      } catch {
        return null;
      }
    })();
    const declarado = origen ?? refererOrigen;
    if (declarado && origenes.length > 0 && !origenes.includes(declarado)) {
      return sendJson(res, 403, { message: 'origen no permitido' });
    }
    const cors = origen && origenes.includes(origen) ? { 'access-control-allow-origin': origen, vary: 'Origin' } : {};

    const params = new URL(req.url ?? '/', 'http://x').searchParams;
    const email = String(params.get('email') ?? '').trim().toLowerCase();
    const uid = params.get('uid') ? String(params.get('uid')) : null;
    const nombre = params.get('nombre') ? String(params.get('nombre')) : '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!uid && !emailOk) return sendJson(res, 400, { message: 'email o uid requerido' }, cors);

    let fila = null;
    if (uid) fila = db.prepare('select * from cuentas where producto = ? and firebaseUid = ?').get(prod.slug, uid);
    if (!fila && emailOk) fila = db.prepare('select * from cuentas where producto = ? and email = ?').get(prod.slug, email);
    // Auto-alta JIT como free (sincronización con Firebase), si el producto lo permite.
    if (!fila && prod.autoAltaFree === 1 && (emailOk || uid)) {
      fila = upsertCliente(prod.slug, { email, uid, nombre, plan: 'free', ciclo: 'lifetime' });
    }
    return sendJson(res, 200, respuestaEntitlement(prod.slug, fila, email), cors);
  }

  // ——— UPSERT de cliente para apps externas (push on-signup / backfill de Firebase) ———
  if (pathname === '/api/clients') {
    const origen = req.headers.origin ?? null;
    if (method === 'OPTIONS') {
      if (origen && origenPermitidoGlobal(origen)) {
        res.writeHead(204, {
          'access-control-allow-origin': origen,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'x-api-key, authorization, content-type',
          'access-control-max-age': '600',
          vary: 'Origin',
        });
        return res.end();
      }
      return sendJson(res, 403, { message: 'origen no permitido' });
    }
    if (method !== 'POST') return sendJson(res, 405, { message: 'método no permitido' });
    const key = String(req.headers['x-api-key'] ?? String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
    if (!key) return sendJson(res, 401, { message: 'apikey requerida' });
    const prod = db.prepare('select * from productos where apiKey = ?').get(key);
    if (!prod) return sendJson(res, 401, { message: 'apikey inválida' });
    const origenes = JSON.parse(prod.origenesPermitidos);
    const refererOrigen = (() => {
      try {
        return req.headers.referer ? new URL(req.headers.referer).origin : null;
      } catch {
        return null;
      }
    })();
    const declarado = origen ?? refererOrigen;
    if (declarado && origenes.length > 0 && !origenes.includes(declarado)) return sendJson(res, 403, { message: 'origen no permitido' });
    const cors = origen && origenes.includes(origen) ? { 'access-control-allow-origin': origen, vary: 'Origin' } : {};

    const body = await readBody(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const uid = body.uid ? String(body.uid) : null;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!uid && !emailOk) return sendJson(res, 400, { message: 'email o uid requerido' }, cors);
    const row = upsertCliente(prod.slug, { email, uid, nombre: body.nombre, plan: body.plan, ciclo: body.cicloFacturacion, inicio: body.inicioVigencia });
    return sendJson(res, 200, { ok: true, ...respuestaEntitlement(prod.slug, row, email) }, cors);
  }

  // ——— superficie pública (sesión de cliente) ———
  if (pathname === '/api/registro' && method === 'POST') {
    if (!originOk(req, PUBLIC_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    const body = await readBody(req);
    const nombre = String(body.nombre ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const plan = String(body.plan ?? '');
    const tipo = String(body.tipo ?? 'persona');
    if (
      nombre.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !(plan in PLANES) ||
      !TIPOS.has(tipo)
    ) {
      return sendJson(res, 400, { message: 'datos inválidos' });
    }
    if (password.length < 12) {
      return sendJson(res, 400, { message: 'la contraseña debe tener al menos 12 caracteres' });
    }
    const id = randomUUID();
    try {
      db.prepare(
        'insert into cuentas (id, nombre, email, passwordHash, plan, tipo, activo, creadaEn) values (?, ?, ?, ?, ?, ?, 1, ?)',
      ).run(id, nombre, email, hashPassword(password), plan, tipo, new Date().toISOString());
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

  // Productos (subcategorías) con su clave de integración visible.
  if (pathname === '/api/admin/productos' && method === 'GET') {
    if ((await adminAuth(req, 'clientes.read')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const filas = db.prepare('select * from productos order by nombre').all();
    return sendJson(
      res,
      200,
      filas.map((f) => ({
        slug: f.slug,
        nombre: f.nombre,
        planes: planesDeProducto(f.slug, true),
        planIdsAsociados: db.prepare('select planId from producto_planes where productoSlug = ?').all(f.slug).map((r) => r.planId),
        apiKey: f.apiKey,
        origenesPermitidos: JSON.parse(f.origenesPermitidos),
        autoAltaFree: f.autoAltaFree === 1,
        clientes: db.prepare('select count(*) c from cuentas where producto = ?').get(f.slug).c,
      })),
    );
  }

  const rotarMatch = pathname.match(/^\/api\/admin\/productos\/([a-z0-9-]+)\/rotar-apikey$/);
  if (rotarMatch !== null && method === 'POST') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    if (!db.prepare('select slug from productos where slug = ?').get(rotarMatch[1])) {
      return sendJson(res, 404, { message: 'producto no existe' });
    }
    const nueva = generarApiKey(rotarMatch[1]);
    db.prepare('update productos set apiKey = ? where slug = ?').run(nueva, rotarMatch[1]);
    return sendJson(res, 200, { apiKey: nueva });
  }

  const prodPutMatch = pathname.match(/^\/api\/admin\/productos\/([a-z0-9-]+)$/);
  if (prodPutMatch !== null && method === 'PUT') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    if (!db.prepare('select slug from productos where slug = ?').get(prodPutMatch[1])) {
      return sendJson(res, 404, { message: 'producto no existe' });
    }
    const body = await readBody(req);
    const origenes = Array.isArray(body.origenesPermitidos)
      ? [...new Set(body.origenesPermitidos.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim()))].slice(0, 10)
      : [];
    db.prepare('update productos set origenesPermitidos = ? where slug = ?').run(JSON.stringify(origenes), prodPutMatch[1]);
    if (typeof body.autoAltaFree === 'boolean') {
      db.prepare('update productos set autoAltaFree = ? where slug = ?').run(body.autoAltaFree ? 1 : 0, prodPutMatch[1]);
    }
    return sendJson(res, 200, { ok: true, origenesPermitidos: origenes });
  }

  // Asociar planes del catálogo a un producto (reemplaza el conjunto).
  const asocMatch = pathname.match(/^\/api\/admin\/productos\/([a-z0-9-]+)\/planes$/);
  if (asocMatch !== null && method === 'PUT') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    if (!db.prepare('select slug from productos where slug = ?').get(asocMatch[1])) {
      return sendJson(res, 404, { message: 'producto no existe' });
    }
    const body = await readBody(req);
    const ids = Array.isArray(body.planIds) ? body.planIds.filter((x) => typeof x === 'string') : [];
    const validos = ids.filter((id) => db.prepare('select 1 from planes_catalogo where id = ?').get(id));
    db.prepare('delete from producto_planes where productoSlug = ?').run(asocMatch[1]);
    for (const id of validos) db.prepare('insert or ignore into producto_planes (productoSlug, planId) values (?, ?)').run(asocMatch[1], id);
    return sendJson(res, 200, { ok: true, planIdsAsociados: validos });
  }

  // ——— catálogo GLOBAL de planes (generador) ———
  if (pathname === '/api/admin/planes' && method === 'GET') {
    if ((await adminAuth(req, 'clientes.read')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    return sendJson(res, 200, db.prepare('select * from planes_catalogo order by precio, nombre').all().map(publicarPlan));
  }

  if (pathname === '/api/admin/planes' && method === 'POST') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const body = await readBody(req);
    const clave = String(body.clave ?? '').trim().toLowerCase();
    const nombre = String(body.nombre ?? '').trim();
    const precio = Number.isFinite(body.precio) ? Math.max(0, Math.round(body.precio)) : 0;
    const features = Array.isArray(body.features) ? body.features.filter((f) => typeof f === 'string' && f.trim()).map((f) => f.trim()).slice(0, 50) : [];
    const ciclos = Array.isArray(body.ciclosPermitidos) ? body.ciclosPermitidos.filter((c) => c in CICLOS) : [];
    if (!/^[a-z0-9-]{2,40}$/.test(clave) || nombre.length < 2) return sendJson(res, 400, { message: 'clave o nombre inválido' });
    const id = randomUUID();
    try {
      db.prepare(
        'insert into planes_catalogo (id, clave, nombre, precio, features, ciclosPermitidos, activo, creadaEn) values (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, clave, nombre, precio, JSON.stringify(features), JSON.stringify(ciclos), body.activo === false ? 0 : 1, new Date().toISOString());
    } catch {
      return sendJson(res, 400, { message: 'ya existe un plan con esa clave' });
    }
    return sendJson(res, 200, { ok: true, id });
  }

  const planCatMatch = pathname.match(/^\/api\/admin\/planes\/([0-9a-f-]{36})$/);
  if (planCatMatch !== null && method === 'PUT') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const actual = db.prepare('select * from planes_catalogo where id = ?').get(planCatMatch[1]);
    if (actual === undefined) return sendJson(res, 404, { message: 'plan no existe' });
    const body = await readBody(req);
    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : actual.nombre;
    const precio = Number.isFinite(body.precio) ? Math.max(0, Math.round(body.precio)) : actual.precio;
    const features = Array.isArray(body.features) ? body.features.filter((f) => typeof f === 'string' && f.trim()).map((f) => f.trim()).slice(0, 50) : JSON.parse(actual.features);
    const ciclos = Array.isArray(body.ciclosPermitidos) ? body.ciclosPermitidos.filter((c) => c in CICLOS) : JSON.parse(actual.ciclosPermitidos);
    const activo = body.activo !== undefined ? (body.activo === true ? 1 : 0) : actual.activo;
    if (nombre.length < 2) return sendJson(res, 400, { message: 'nombre inválido' });
    db.prepare('update planes_catalogo set nombre = ?, precio = ?, features = ?, ciclosPermitidos = ?, activo = ? where id = ?').run(
      nombre,
      precio,
      JSON.stringify(features),
      JSON.stringify(ciclos),
      activo,
      planCatMatch[1],
    );
    return sendJson(res, 200, publicarPlan(db.prepare('select * from planes_catalogo where id = ?').get(planCatMatch[1])));
  }

  if (planCatMatch !== null && method === 'DELETE') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    db.prepare('delete from producto_planes where planId = ?').run(planCatMatch[1]);
    db.prepare('delete from planes_catalogo where id = ?').run(planCatMatch[1]);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/cuentas' && method === 'GET') {
    if ((await adminAuth(req, 'clientes.read')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const producto = new URL(req.url ?? '/', 'http://x').searchParams.get('producto');
    const cuentas = producto
      ? db.prepare('select * from cuentas where producto = ? order by creadaEn desc').all(producto)
      : db.prepare('select * from cuentas order by creadaEn desc').all();
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

  // Alta manual de un cliente de producto (sin login de portal; passwordHash vacío).
  if (pathname === '/api/admin/cuentas' && method === 'POST') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const body = await readBody(req);
    const nombre = String(body.nombre ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const producto = String(body.producto ?? '');
    const plan = String(body.plan ?? '');
    const ciclo = String(body.cicloFacturacion ?? 'mensual');
    const inicio = body.inicioVigencia ? String(body.inicioVigencia) : new Date().toISOString();
    const prod = getProducto(producto);
    if (prod === null) return sendJson(res, 400, { message: 'producto inválido' });
    if (nombre.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { message: 'nombre o email inválido' });
    const planObj = prod.planes.find((p) => p.clave === plan);
    if (planObj === undefined) return sendJson(res, 400, { message: 'plan inválido para el producto' });
    if (!(ciclo in CICLOS)) return sendJson(res, 400, { message: 'ciclo inválido' });
    if (planObj.ciclosPermitidos.length > 0 && !planObj.ciclosPermitidos.includes(ciclo)) {
      return sendJson(res, 400, { message: 'ese ciclo no está permitido para el plan' });
    }
    const fin = calcularFinVigencia(inicio, ciclo);
    const id = randomUUID();
    try {
      db.prepare(
        `insert into cuentas (id, nombre, email, passwordHash, plan, tipo, activo, creadaEn, producto, cicloFacturacion, inicioVigencia, finVigencia)
         values (?, ?, ?, '', ?, 'empresa', 1, ?, ?, ?, ?, ?)`,
      ).run(id, nombre, email, plan, new Date().toISOString(), producto, ciclo, inicio, fin);
    } catch {
      return sendJson(res, 400, { message: 'no se pudo crear (¿email ya usado?)' });
    }
    return sendJson(res, 200, { ok: true, id });
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

  // Editar plan / ciclo / inicio de vigencia / estado de un cliente.
  const editarMatch = pathname.match(/^\/api\/admin\/cuentas\/([0-9a-f-]{36})$/);
  if (editarMatch !== null && method === 'PUT') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    const cuenta = db.prepare('select * from cuentas where id = ?').get(editarMatch[1]);
    if (cuenta === undefined) return sendJson(res, 404, { message: 'cliente no existe' });
    const body = await readBody(req);
    const prod = cuenta.producto ? getProducto(cuenta.producto) : null;
    const plan = body.plan !== undefined ? String(body.plan) : cuenta.plan;
    const ciclo = body.cicloFacturacion !== undefined ? String(body.cicloFacturacion) : (cuenta.cicloFacturacion ?? 'mensual');
    const inicio = body.inicioVigencia !== undefined ? String(body.inicioVigencia) : (cuenta.inicioVigencia ?? new Date().toISOString());
    const activo = body.activo !== undefined ? (body.activo === true ? 1 : 0) : cuenta.activo;
    const planObj = prod !== null ? prod.planes.find((p) => p.clave === plan) : null;
    if (prod !== null && planObj === undefined) return sendJson(res, 400, { message: 'plan inválido para el producto' });
    if (!(ciclo in CICLOS)) return sendJson(res, 400, { message: 'ciclo inválido' });
    if (planObj && planObj.ciclosPermitidos.length > 0 && !planObj.ciclosPermitidos.includes(ciclo)) {
      return sendJson(res, 400, { message: 'ese ciclo no está permitido para el plan' });
    }
    const fin = calcularFinVigencia(inicio, ciclo);
    db.prepare(
      'update cuentas set plan = ?, cicloFacturacion = ?, inicioVigencia = ?, finVigencia = ?, activo = ? where id = ?',
    ).run(plan, ciclo, inicio, fin, activo, cuenta.id);
    if (activo === 0) db.prepare('delete from sesiones where cuentaId = ?').run(cuenta.id);
    const actualizada = db.prepare('select * from cuentas where id = ?').get(cuenta.id);
    return sendJson(res, 200, publicarCuenta(actualizada));
  }

  // Borrar un cliente (y sus facturas/sesiones).
  const borrarMatch = pathname.match(/^\/api\/admin\/cuentas\/([0-9a-f-]{36})$/);
  if (borrarMatch !== null && method === 'DELETE') {
    if (!originOk(req, ADMIN_ORIGIN)) return sendJson(res, 403, { message: 'origen no permitido' });
    if ((await adminAuth(req, 'clientes.write')) === null) {
      return sendJson(res, 401, { message: 'sesión de administrador requerida' });
    }
    db.prepare('delete from facturas where cuentaId = ?').run(borrarMatch[1]);
    db.prepare('delete from sesiones where cuentaId = ?').run(borrarMatch[1]);
    db.prepare('delete from cuentas where id = ?').run(borrarMatch[1]);
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
    { surface: 'web', path: '/clientes/registro', component: './RegistroIsland', ssr: 'server', permissions: [] },
    { surface: 'web', path: '/clientes/acceso', component: './AccesoIsland', ssr: 'server', permissions: [] },
    { surface: 'web', path: '/clientes/portal', component: './PortalIsland', ssr: 'server', permissions: [] },
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
      'no-cache',
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
  if (pathname === '/render' && req.method === 'POST') {
    handleRender(req, res).catch((error) => {
      console.error('error en /render:', error);
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
