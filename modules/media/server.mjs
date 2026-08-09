import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_MODULE,
  HEADER_TIMESTAMP,
  HEADER_SIGNATURE,
} from '@likekiri/contract/hmac';

/**
 * Módulo media: gestor multimedia del admin con almacenamiento y API propios.
 * Sube archivos (binario directo), los recorta, les quita el fondo blanco
 * (flood-fill desde los bordes: respeta blancos interiores como letras) y los
 * sirve públicamente para usarlos en el sitio.
 */

const PORT = Number(process.env.MODULE_PORT ?? 4008);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY =
  process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const DATA_DIR = resolve(process.env.MODULE_DATA_DIR ?? new URL('./data', import.meta.url).pathname);
const CORE_URL = process.env.CORE_INTERNAL_URL ?? 'http://127.0.0.1:3000';
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? 'https://admin.likekiri.com';
const MODULE_ID = 'media';
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

const FILES_DIR = join(DATA_DIR, 'archivos');
mkdirSync(FILES_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'media.sqlite'));
db.exec(`
  create table if not exists archivos (
    id text primary key,
    nombre text not null,
    mime text not null,
    ext text not null,
    bytes integer not null,
    ancho integer,
    alto integer,
    creadoEn text not null,
    actualizadoEn text not null
  );
`);

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readRawBody(req, limit) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        rejectBody(new Error('archivo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', rejectBody);
  });
}

/** La autorización de administradores la decide el core (permisos media.*). */
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

const filaPublica = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  mime: fila.mime,
  bytes: fila.bytes,
  ancho: fila.ancho,
  alto: fila.alto,
  creadoEn: fila.creadoEn,
  actualizadoEn: fila.actualizadoEn,
  url: `/modules/media/files/${fila.id}.${fila.ext}`,
});

function rutaArchivo(fila) {
  return join(FILES_DIR, `${fila.id}.${fila.ext}`);
}

async function actualizarDimensiones(fila) {
  if (fila.ext === 'svg' || fila.ext === 'ico') return;
  const meta = await sharp(rutaArchivo(fila)).metadata();
  const stats = statSync(rutaArchivo(fila));
  db.prepare('update archivos set ancho = ?, alto = ?, bytes = ?, actualizadoEn = ? where id = ?').run(
    meta.width ?? null,
    meta.height ?? null,
    stats.size,
    new Date().toISOString(),
    fila.id,
  );
}

/**
 * Fondo transparente por flood-fill: parte de TODOS los píxeles del borde que
 * sean casi blancos y avanza solo por vecinos casi blancos. Los blancos
 * interiores (letras, brillos) no se tocan porque no conectan con el borde.
 */
async function transparentarFondo(fila, tolerancia = 12) {
  const origen = rutaArchivo(fila);
  const { data, info } = await sharp(origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const umbral = 255 - tolerancia * 3;
  const esCasiBlanco = (i) => data[i] >= umbral && data[i + 1] >= umbral && data[i + 2] >= umbral;
  const visitado = new Uint8Array(width * height);
  const cola = [];

  for (let x = 0; x < width; x += 1) {
    cola.push(x, x + (height - 1) * width);
  }
  for (let y = 0; y < height; y += 1) {
    cola.push(y * width, y * width + width - 1);
  }

  while (cola.length > 0) {
    const pixel = cola.pop();
    if (visitado[pixel] === 1) continue;
    visitado[pixel] = 1;
    const offset = pixel * channels;
    if (!esCasiBlanco(offset)) continue;
    data[offset + 3] = 0; // alpha 0
    const x = pixel % width;
    const y = (pixel / width) | 0;
    if (x > 0) cola.push(pixel - 1);
    if (x < width - 1) cola.push(pixel + 1);
    if (y > 0) cola.push(pixel - width);
    if (y < height - 1) cola.push(pixel + width);
  }

  // El resultado siempre es PNG (necesita canal alfa).
  const temporal = `${origen}.tmp`;
  await sharp(data, { raw: { width, height, channels } }).png().toFile(temporal);
  const nuevaExt = 'png';
  const destino = join(FILES_DIR, `${fila.id}.${nuevaExt}`);
  await rename(temporal, destino);
  if (fila.ext !== nuevaExt) {
    unlinkSync(origen);
    db.prepare("update archivos set ext = 'png', mime = 'image/png' where id = ?").run(fila.id);
  }
  const actualizada = db.prepare('select * from archivos where id = ?').get(fila.id);
  await actualizarDimensiones(actualizada);
}

// ——— API ———
async function handleApi(req, res, pathname, searchParams) {
  const method = req.method ?? 'GET';
  const mutante = method !== 'GET' && method !== 'HEAD';
  if (mutante && req.headers.origin !== ADMIN_ORIGIN) {
    return sendJson(res, 403, { message: 'origen no permitido' });
  }
  const permiso = mutante ? 'media.write' : 'media.read';
  if ((await adminAuth(req, permiso)) === null) {
    return sendJson(res, 401, { message: 'sesión de administrador requerida' });
  }

  if (pathname === '/api/archivos' && method === 'GET') {
    const filas = db.prepare('select * from archivos order by creadoEn desc').all();
    return sendJson(res, 200, filas.map(filaPublica));
  }

  if (pathname === '/api/archivos' && method === 'POST') {
    const mime = req.headers['content-type'] ?? '';
    const ext = MIME_EXT[mime.split(';')[0]];
    if (ext === undefined) {
      return sendJson(res, 400, { message: 'formato no soportado (png, jpg, webp, svg, ico)' });
    }
    const nombre = (searchParams.get('nombre') ?? 'archivo').slice(0, 120);
    let cuerpo;
    try {
      cuerpo = await readRawBody(req, MAX_UPLOAD_BYTES);
    } catch {
      return sendJson(res, 413, { message: 'archivo demasiado grande (máx. 15 MB)' });
    }
    if (cuerpo.length === 0) return sendJson(res, 400, { message: 'archivo vacío' });

    const id = randomUUID();
    const ahora = new Date().toISOString();
    await writeFile(join(FILES_DIR, `${id}.${ext}`), cuerpo);
    db.prepare(
      'insert into archivos (id, nombre, mime, ext, bytes, creadoEn, actualizadoEn) values (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, nombre, mime.split(';')[0], ext, cuerpo.length, ahora, ahora);
    const fila = db.prepare('select * from archivos where id = ?').get(id);
    try {
      await actualizarDimensiones(fila);
    } catch {
      // sin dimensiones (p. ej. svg malformado): el archivo queda igualmente
    }
    return sendJson(res, 200, filaPublica(db.prepare('select * from archivos where id = ?').get(id)));
  }

  const accion = pathname.match(/^\/api\/archivos\/([0-9a-f-]{36})(?:\/(recortar|transparentar))?$/);
  if (accion !== null) {
    const fila = db.prepare('select * from archivos where id = ?').get(accion[1]);
    if (fila === undefined) return sendJson(res, 404, { message: 'no existe' });

    if (accion[2] === undefined && method === 'DELETE') {
      try {
        unlinkSync(rutaArchivo(fila));
      } catch {
        // si el archivo físico ya no está, se borra igualmente el registro
      }
      db.prepare('delete from archivos where id = ?').run(fila.id);
      return sendJson(res, 200, { ok: true });
    }

    if (fila.ext === 'svg' || fila.ext === 'ico') {
      return sendJson(res, 400, { message: 'esta operación no aplica a SVG/ICO' });
    }

    if (accion[2] === 'recortar' && method === 'POST') {
      let payload;
      try {
        payload = JSON.parse((await readRawBody(req, 10_000)).toString());
      } catch {
        return sendJson(res, 400, { message: 'JSON inválido' });
      }
      const left = Math.max(0, Math.floor(Number(payload.x)));
      const top = Math.max(0, Math.floor(Number(payload.y)));
      const width = Math.floor(Number(payload.ancho));
      const height = Math.floor(Number(payload.alto));
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 8 || height < 8) {
        return sendJson(res, 400, { message: 'recorte inválido (mínimo 8×8)' });
      }
      const origen = rutaArchivo(fila);
      const temporal = `${origen}.tmp`;
      try {
        await sharp(origen).extract({ left, top, width, height }).toFile(temporal);
      } catch (error) {
        return sendJson(res, 400, { message: `no se pudo recortar: ${String(error)}` });
      }
      await rename(temporal, origen);
      await actualizarDimensiones(fila);
      return sendJson(res, 200, filaPublica(db.prepare('select * from archivos where id = ?').get(fila.id)));
    }

    if (accion[2] === 'transparentar' && method === 'POST') {
      try {
        await transparentarFondo(fila);
      } catch (error) {
        return sendJson(res, 500, { message: `no se pudo transparentar: ${String(error)}` });
      }
      return sendJson(res, 200, filaPublica(db.prepare('select * from archivos where id = ?').get(fila.id)));
    }
  }

  return sendJson(res, 404, { message: 'no existe' });
}

/** Archivos públicos: los consume el sitio (logo, imágenes de contenido). */
function serveFile(res, pathname) {
  const match = pathname.match(/^\/files\/([0-9a-f-]{36})\.([a-z0-9]+)$/);
  if (match === null) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  const fila = db.prepare('select * from archivos where id = ?').get(match[1]);
  const file = fila === undefined ? null : rutaArchivo(fila);
  if (file === null || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  res.writeHead(200, {
    'content-type': fila.mime,
    'access-control-allow-origin': '*',
    // Los archivos se editan en el gestor: cache corta con revalidación.
    'cache-control': 'public, max-age=60',
  });
  createReadStream(file).pipe(res);
}

// ——— manifest + estáticos federados (receta estándar de módulo) ———
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Multimedia',
  version: pkg.version,
  namespace: 'media',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./MediaPage'],
  routes: [
    {
      surface: 'admin',
      path: '/media',
      component: './MediaPage',
      permissions: ['media.read'],
    },
  ],
  menu: [
    { surface: 'admin', slot: 'sidebar', label: 'Multimedia', icon: 'image', order: 17, path: '/media' },
  ],
  permissions: [
    { key: 'media.read', label: 'Ver la biblioteca multimedia' },
    { key: 'media.write', label: 'Subir y editar archivos multimedia' },
  ],
};

const MIME_STATIC = {
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
    'content-type': MIME_STATIC[extname(file)] ?? 'application/octet-stream',
    'access-control-allow-origin': '*',
    'cache-control':
      pathname === '/remoteEntry.js' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, url.searchParams).catch((error) => {
      console.error('error en la API:', error);
      if (!res.headersSent) sendJson(res, 500, { message: 'error interno' });
    });
    return;
  }
  if (pathname.startsWith('/files/')) {
    serveFile(res, pathname);
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
  console.log(`módulo media escuchando en http://127.0.0.1:${PORT}`);
});
