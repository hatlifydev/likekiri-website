import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer } from 'ws';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_MODULE,
  HEADER_TIMESTAMP,
  HEADER_SIGNATURE,
} from '@likekiri/contract/hmac';

/**
 * Módulo chat: conversación en vivo por WebSocket.
 *
 *  - Widget en el sitio público (likekiri.com): un visitante (anónimo o cliente
 *    autenticado) abre una conversación; los mensajes viajan por WS y se
 *    persisten en SQLite propio.
 *  - Panel de agente en el admin (admin.likekiri.com): lista conversaciones,
 *    recibe notificación de mensajes nuevos y responde en tiempo real.
 *  - Identidad: anónimo (cookie de visitante), cliente (mejor esfuerzo: se
 *    consulta el módulo clientes con la cookie reenviada) o agente (sesión
 *    admin validada contra el core).
 *
 * Costuras a futuro (hoy NO implementadas, pero el modelo ya las contempla):
 *  - canal 'whatsapp' en conversaciones/mensajes (hoy solo 'web').
 *  - autor 'bot' para respuestas automáticas de un RAG.
 *  - derivar una conversación a WhatsApp (campo derivadoA).
 */

const PORT = Number(process.env.MODULE_PORT ?? 4009);
const KEY = process.env.MODULE_HMAC_KEY ?? '';
const REMOTE_ENTRY = process.env.MODULE_REMOTE_ENTRY ?? `http://127.0.0.1:${PORT}/remoteEntry.js`;
const DIST = resolve(process.env.MODULE_PUBLIC_DIR ?? new URL('./dist', import.meta.url).pathname);
const DATA_DIR = resolve(process.env.MODULE_DATA_DIR ?? new URL('./data', import.meta.url).pathname);
const CORE_URL = process.env.CORE_INTERNAL_URL ?? 'http://127.0.0.1:3000';
const CLIENTES_URL = process.env.CLIENTES_INTERNAL_URL ?? 'http://127.0.0.1:4006';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? 'https://likekiri.com';
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? 'https://admin.likekiri.com';
const MODULE_ID = 'chat';
const VISITOR_COOKIE = '__Host-lk_chat';

if (KEY.length < 32) {
  console.error('MODULE_HMAC_KEY es obligatoria (mínimo 32 caracteres).');
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'chat.sqlite'));
db.exec(`
  create table if not exists conversaciones (
    id text primary key,
    visitorId text not null,
    canal text not null default 'web',
    identidad text,
    estado text not null default 'abierta',
    noLeidosAgente integer not null default 0,
    derivadoA text,
    creadaEn text not null,
    actualizadaEn text not null
  );
  create table if not exists mensajes (
    id text primary key,
    convId text not null,
    autor text not null,
    texto text not null,
    canal text not null default 'web',
    creadoEn text not null
  );
  create index if not exists idx_mensajes_conv on mensajes(convId, creadoEn);
`);
{
  const cols = db.prepare('pragma table_info(mensajes)').all();
  if (!cols.some((c) => c.name === 'autorNombre')) db.exec('alter table mensajes add column autorNombre text');
  if (!cols.some((c) => c.name === 'autorCargo')) db.exec('alter table mensajes add column autorCargo text');
  const ccols = db.prepare('pragma table_info(conversaciones)').all();
  if (!ccols.some((c) => c.name === 'asignadoA')) db.exec('alter table conversaciones add column asignadoA text');
  if (!ccols.some((c) => c.name === 'asignadoNombre')) db.exec('alter table conversaciones add column asignadoNombre text');
  if (!ccols.some((c) => c.name === 'asignadoEn')) db.exec('alter table conversaciones add column asignadoEn text');
}

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
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
function readCookie(header, name) {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** Agente: sesión admin válida con permiso chat.*. Devuelve el me o null. */
async function agenteAuth(cookie, permiso) {
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

/** Identidad del agente: userId, nombre para mostrar, cargo y si es superadmin. */
function agenteDe(me) {
  const permisos = Array.isArray(me?.permissions) ? me.permissions : [];
  return {
    userId: me?.userId ?? null,
    nombre: me?.firstName ?? me?.displayName ?? 'Equipo LikeKiri',
    cargo: me?.title ?? null,
    isSuperadmin: me?.isSuperadmin === true || permisos.includes('*'),
  };
}

/**
 * Identidad del visitante (mejor esfuerzo): si trae la cookie de cliente,
 * se consulta el módulo clientes. Si clientes está caído, se degrada a
 * anónimo — sin acoplar la disponibilidad del chat a la de clientes.
 */
async function identidadCliente(cookie) {
  if (!cookie || !cookie.includes('lk_clientes')) return null;
  try {
    const r = await fetch(`${CLIENTES_URL}/api/mi-cuenta`, { headers: { cookie }, signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    const data = await r.json();
    return { tipo: 'cliente', nombre: data.cuenta?.nombre ?? null, email: data.cuenta?.email ?? null };
  } catch {
    return null;
  }
}

const publicarConv = (c) => ({
  id: c.id,
  canal: c.canal,
  estado: c.estado,
  identidad: c.identidad ? JSON.parse(c.identidad) : null,
  noLeidosAgente: c.noLeidosAgente,
  derivadoA: c.derivadoA,
  asignadoA: c.asignadoA ?? null,
  asignadoNombre: c.asignadoNombre ?? null,
  creadaEn: c.creadaEn,
  actualizadaEn: c.actualizadaEn,
});
const mensajesDe = (convId) =>
  db.prepare('select id, autor, texto, canal, autorNombre, autorCargo, creadoEn from mensajes where convId = ? order by creadoEn').all(convId);

function guardarMensaje(convId, autor, texto, canal = 'web', firma = null) {
  const msg = {
    id: randomUUID(), convId, autor, texto, canal,
    autorNombre: firma?.nombre ?? null, autorCargo: firma?.cargo ?? null,
    creadoEn: new Date().toISOString(),
  };
  db.prepare('insert into mensajes (id, convId, autor, texto, canal, autorNombre, autorCargo, creadoEn) values (?, ?, ?, ?, ?, ?, ?, ?)').run(
    msg.id, convId, autor, texto, canal, msg.autorNombre, msg.autorCargo, msg.creadoEn,
  );
  db.prepare('update conversaciones set actualizadaEn = ? where id = ?').run(msg.creadoEn, convId);
  return msg;
}

/** Asigna (o desasigna con agente=null) y notifica a todos los agentes. */
function asignar(convId, agente) {
  db.prepare('update conversaciones set asignadoA = ?, asignadoNombre = ?, asignadoEn = ? where id = ?').run(
    agente?.userId ?? null,
    agente?.nombre ?? null,
    agente ? new Date().toISOString() : null,
    convId,
  );
  const conv = db.prepare('select * from conversaciones where id = ?').get(convId);
  aAgentes({ tipo: 'asignacion', convId, asignadoA: conv.asignadoA ?? null, asignadoNombre: conv.asignadoNombre ?? null });
  return conv;
}

// ——— WebSocket ———
const agentes = new Set(); // sockets de agentes (reciben todo)
const visitantes = new Map(); // visitorId -> Set<socket>

function aAgentes(evento) {
  const payload = JSON.stringify(evento);
  for (const ws of agentes) if (ws.readyState === ws.OPEN) ws.send(payload);
}
function aVisitantes(convId, evento) {
  const conv = db.prepare('select visitorId from conversaciones where id = ?').get(convId);
  if (!conv) return;
  const set = visitantes.get(conv.visitorId);
  if (!set) return;
  const payload = JSON.stringify(evento);
  for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(payload);
}

async function onConnection(ws, req) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rol = url.searchParams.get('rol') === 'agente' ? 'agente' : 'visitante';
  const cookie = req.headers.cookie ?? '';

  if (rol === 'agente') {
    const me = await agenteAuth(cookie, 'chat.read');
    if (me === null) {
      ws.close(4401, 'no autorizado');
      return;
    }
    ws.rol = 'agente';
    ws.agente = agenteDe(me);
    agentes.add(ws);
    ws.on('close', () => agentes.delete(ws));
    ws.on('message', (raw) => onAgenteMensaje(ws, raw));
    ws.send(JSON.stringify({ tipo: 'listo', rol: 'agente', yo: ws.agente }));
    return;
  }

  // visitante: identificado por su cookie. La conversación se crea al enviar
  // el primer mensaje (no al cargar la página).
  const visitorId = readCookie(cookie, VISITOR_COOKIE);
  if (visitorId === null) {
    ws.close(4400, 'sesión no iniciada');
    return;
  }
  ws.rol = 'visitante';
  ws.visitorId = visitorId;
  ws.identidad = await identidadCliente(cookie);
  const conv = db
    .prepare("select * from conversaciones where visitorId = ? and estado = 'abierta' order by actualizadaEn desc limit 1")
    .get(visitorId);
  ws.convId = conv ? conv.id : null;
  if (!visitantes.has(visitorId)) visitantes.set(visitorId, new Set());
  visitantes.get(visitorId).add(ws);
  ws.on('close', () => {
    const set = visitantes.get(visitorId);
    if (set) { set.delete(ws); if (set.size === 0) visitantes.delete(visitorId); }
  });
  ws.on('message', (raw) => onVisitanteMensaje(ws, raw));
  if (conv) ws.send(JSON.stringify({ tipo: 'historial', mensajes: mensajesDe(conv.id) }));
}

/** Devuelve la conversación abierta del visitante, creándola si no existe. */
function resolverConvVisitor(ws) {
  if (ws.convId != null) {
    const c = db.prepare("select * from conversaciones where id = ? and estado = 'abierta'").get(ws.convId);
    if (c) return c;
  }
  let conv = db
    .prepare("select * from conversaciones where visitorId = ? and estado = 'abierta' order by actualizadaEn desc limit 1")
    .get(ws.visitorId);
  if (conv) { ws.convId = conv.id; return conv; }
  const ahora = new Date().toISOString();
  const id = randomUUID();
  db.prepare('insert into conversaciones (id, visitorId, canal, identidad, estado, creadaEn, actualizadaEn) values (?, ?, ?, ?, ?, ?, ?)')
    .run(id, ws.visitorId, 'web', ws.identidad ? JSON.stringify(ws.identidad) : null, 'abierta', ahora, ahora);
  conv = db.prepare('select * from conversaciones where id = ?').get(id);
  ws.convId = id;
  aAgentes({ tipo: 'nueva', conv: publicarConv(conv) });
  aVisitantes(id, { tipo: 'sesion', convId: id });
  return conv;
}

function onVisitanteMensaje(ws, raw) {
  let ev;
  try { ev = JSON.parse(raw.toString()); } catch { return; }
  if (ev.tipo !== 'mensaje' || typeof ev.texto !== 'string') return;
  const texto = ev.texto.trim().slice(0, 4000);
  if (texto === '') return;
  const conv = resolverConvVisitor(ws);
  const msg = guardarMensaje(conv.id, 'visitante', texto);
  db.prepare('update conversaciones set noLeidosAgente = noLeidosAgente + 1 where id = ?').run(conv.id);
  aVisitantes(conv.id, { tipo: 'mensaje', mensaje: msg });
  const conv2 = db.prepare('select * from conversaciones where id = ?').get(conv.id);
  aAgentes({ tipo: 'mensaje', convId: conv.id, mensaje: msg, conv: publicarConv(conv2) });
  // COSTURA RAG: aquí un bot podría responder (autor 'bot') y/o derivar a WhatsApp.
}

function onAgenteMensaje(ws, raw) {
  let ev;
  try { ev = JSON.parse(raw.toString()); } catch { return; }
  const yo = ws.agente;

  if (ev.tipo === 'ver' && typeof ev.convId === 'string') {
    db.prepare('update conversaciones set noLeidosAgente = 0 where id = ?').run(ev.convId);
    aAgentes({ tipo: 'leido', convId: ev.convId });
    return;
  }

  if ((ev.tipo === 'archivar' || ev.tipo === 'desarchivar') && typeof ev.convId === 'string') {
    const estado = ev.tipo === 'archivar' ? 'archivada' : 'abierta';
    db.prepare('update conversaciones set estado = ? where id = ?').run(estado, ev.convId);
    aAgentes({ tipo: 'estado', convId: ev.convId, estado });
    return;
  }

  if (ev.tipo === 'tomar' && typeof ev.convId === 'string') {
    const conv = db.prepare('select * from conversaciones where id = ?').get(ev.convId);
    if (conv === undefined) return;
    if (conv.asignadoA != null && conv.asignadoA !== yo.userId && !yo.isSuperadmin) {
      ws.send(JSON.stringify({ tipo: 'error', convId: ev.convId, mensaje: `La atiende ${conv.asignadoNombre}` }));
      return;
    }
    asignar(ev.convId, yo);
    return;
  }

  if (ev.tipo === 'liberar' && typeof ev.convId === 'string') {
    const conv = db.prepare('select * from conversaciones where id = ?').get(ev.convId);
    if (conv === undefined) return;
    if (conv.asignadoA !== yo.userId && !yo.isSuperadmin) {
      ws.send(JSON.stringify({ tipo: 'error', convId: ev.convId, mensaje: 'No la tienes asignada' }));
      return;
    }
    asignar(ev.convId, null);
    return;
  }

  if (ev.tipo === 'transferir' && typeof ev.convId === 'string' && typeof ev.aUserId === 'string') {
    const conv = db.prepare('select * from conversaciones where id = ?').get(ev.convId);
    if (conv === undefined) return;
    if (conv.asignadoA !== yo.userId && !yo.isSuperadmin) {
      ws.send(JSON.stringify({ tipo: 'error', convId: ev.convId, mensaje: 'Solo quien la atiende puede transferirla' }));
      return;
    }
    asignar(ev.convId, { userId: ev.aUserId, nombre: String(ev.aNombre ?? 'Agente') });
    return;
  }

  if (ev.tipo === 'responder' && typeof ev.convId === 'string' && typeof ev.texto === 'string') {
    const texto = ev.texto.trim().slice(0, 4000);
    if (texto === '') return;
    const conv = db.prepare('select * from conversaciones where id = ?').get(ev.convId);
    if (conv === undefined) return;
    // Exclusividad: sin asignar, el primero que responde la toma; si la atiende
    // otro, se rechaza (salvo superadmin, que igualmente debe tomarla primero).
    if (conv.asignadoA == null) {
      asignar(ev.convId, yo);
    } else if (conv.asignadoA !== yo.userId) {
      ws.send(JSON.stringify({ tipo: 'error', convId: ev.convId, mensaje: `La atiende ${conv.asignadoNombre}` }));
      return;
    }
    const msg = guardarMensaje(ev.convId, 'agente', texto, 'web', { nombre: yo.nombre, cargo: yo.cargo });
    aVisitantes(ev.convId, { tipo: 'mensaje', mensaje: msg });
    aAgentes({ tipo: 'mensaje', convId: ev.convId, mensaje: msg });
  }
}

// ——— API REST ———
async function handleApi(req, res, pathname, url) {
  const method = req.method ?? 'GET';
  const cookie = req.headers.cookie ?? '';

  // visitante: inicia/reanuda su conversación y fija cookie de visitante
  if (pathname === '/api/sesion' && method === 'POST') {
    if (req.headers.origin !== PUBLIC_ORIGIN) return sendJson(res, 403, { message: 'origen no permitido' });
    let visitorId = readCookie(cookie, VISITOR_COOKIE);
    let setCookie;
    if (visitorId === null) {
      visitorId = randomBytes(18).toString('base64url');
      setCookie = `${VISITOR_COOKIE}=${visitorId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 180}`;
    }
    const identidad = await identidadCliente(cookie);
    // La conversación NO se crea aquí: solo existe cuando el visitante escribe.
    const conv = db
      .prepare("select * from conversaciones where visitorId = ? and estado = 'abierta' order by actualizadaEn desc limit 1")
      .get(visitorId);
    return sendJson(
      res,
      200,
      {
        conversacion: conv ? publicarConv(conv) : null,
        identidad,
        historial: conv ? mensajesDe(conv.id) : [],
      },
      setCookie ? { 'set-cookie': setCookie } : {},
    );
  }

  // agente: listado, historial, responder (REST además del WS)
  if (pathname.startsWith('/api/admin/')) {
    const permiso = method === 'GET' ? 'chat.read' : 'chat.write';
    if (method !== 'GET' && req.headers.origin !== ADMIN_ORIGIN) {
      return sendJson(res, 403, { message: 'origen no permitido' });
    }
    const meAgente = await agenteAuth(cookie, permiso);
    if (meAgente === null) {
      return sendJson(res, 401, { message: 'sesión de agente requerida' });
    }
    if (pathname === '/api/admin/conversaciones' && method === 'GET') {
      const p = url.searchParams;
      const estado = p.get('estado') ?? 'abierta';          // abierta | archivada | todos
      const tipo = p.get('tipo') ?? 'todos';                // cliente | anonimo | todos
      const q = (p.get('q') ?? '').trim().toLowerCase();
      const desde = p.get('desde');                         // YYYY-MM-DD
      const hasta = p.get('hasta');
      const page = Math.max(1, Number(p.get('page') ?? '1') || 1);
      const limit = Math.min(50, Math.max(5, Number(p.get('limit') ?? '20') || 20));
      const cond = [];
      const args = [];
      if (estado !== 'todos') { cond.push('estado = ?'); args.push(estado); }
      if (tipo === 'cliente') cond.push('identidad is not null');
      else if (tipo === 'anonimo') cond.push('identidad is null');
      if (desde) { cond.push('actualizadaEn >= ?'); args.push(desde + 'T00:00:00.000Z'); }
      if (hasta) { cond.push('actualizadaEn <= ?'); args.push(hasta + 'T23:59:59.999Z'); }
      if (q) { cond.push('(lower(coalesce(identidad, \'\')) like ? or lower(id) like ?)'); args.push('%' + q + '%', '%' + q + '%'); }
      const where = cond.length ? 'where ' + cond.join(' and ') : '';
      const total = Number(db.prepare(`select count(*) as n from conversaciones ${where}`).get(...args).n);
      const convs = db.prepare(`select * from conversaciones ${where} order by actualizadaEn desc limit ? offset ?`).all(...args, limit, (page - 1) * limit);
      const totalNoLeidos = Number(db.prepare("select coalesce(sum(noLeidosAgente), 0) as n from conversaciones where estado = 'abierta'").get().n);
      return sendJson(res, 200, { conversaciones: convs.map(publicarConv), total, page, limit, totalNoLeidos });
    }
    const hist = pathname.match(/^\/api\/admin\/conversaciones\/([0-9a-f-]{36})$/);
    if (hist !== null && method === 'GET') {
      const conv = db.prepare('select * from conversaciones where id = ?').get(hist[1]);
      if (conv === undefined) return sendJson(res, 404, { message: 'no existe' });
      db.prepare('update conversaciones set noLeidosAgente = 0 where id = ?').run(hist[1]);
      aAgentes({ tipo: 'leido', convId: hist[1] });
      return sendJson(res, 200, { conversacion: publicarConv(conv), mensajes: mensajesDe(hist[1]) });
    }
    const resp = pathname.match(/^\/api\/admin\/conversaciones\/([0-9a-f-]{36})\/responder$/);
    if (resp !== null && method === 'POST') {
      const conv = db.prepare('select * from conversaciones where id = ?').get(resp[1]);
      if (conv === undefined) return sendJson(res, 404, { message: 'no existe' });
      const yo = agenteDe(meAgente);
      if (conv.asignadoA == null) {
        asignar(resp[1], yo);
      } else if (conv.asignadoA !== yo.userId) {
        return sendJson(res, 409, { message: `La atiende ${conv.asignadoNombre}` });
      }
      const body = await readBody(req);
      const texto = String(body.texto ?? '').trim().slice(0, 4000);
      if (texto === '') return sendJson(res, 400, { message: 'mensaje vacío' });
      const msg = guardarMensaje(resp[1], 'agente', texto, 'web', { nombre: yo.nombre, cargo: yo.cargo });
      aVisitantes(resp[1], { tipo: 'mensaje', mensaje: msg });
      aAgentes({ tipo: 'mensaje', convId: resp[1], mensaje: msg });
      return sendJson(res, 200, { mensaje: msg });
    }
    return sendJson(res, 404, { message: 'no existe' });
  }

  return sendJson(res, 404, { message: 'no existe' });
}

// ——— manifest + estáticos ———
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const manifest = {
  contractVersion: '1',
  moduleId: MODULE_ID,
  name: 'Chat',
  version: pkg.version,
  namespace: 'chat',
  remoteEntry: REMOTE_ENTRY,
  exposes: ['./ChatWidgetIsland', './ChatAdminPage'],
  routes: [
    { surface: 'web', path: '/chat/widget', component: './ChatWidgetIsland', ssr: 'shell', widget: true, permissions: [] },
    { surface: 'admin', path: '/chat', component: './ChatAdminPage', permissions: ['chat.read'] },
  ],
  menu: [{ surface: 'admin', slot: 'sidebar', label: 'Conversaciones', icon: 'chat', order: 16, path: '/chat' }],
  permissions: [
    { key: 'chat.read', label: 'Ver conversaciones del chat' },
    { key: 'chat.write', label: 'Responder conversaciones del chat' },
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
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, url).catch((error) => {
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

// WebSocket bajo /ws (Caddy proxya el upgrade; handle_path deja /ws al módulo).
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/ws') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    onConnection(ws, req).catch((error) => {
      console.error('error en la conexión WS:', error);
      try { ws.close(1011); } catch {}
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`módulo chat escuchando en http://127.0.0.1:${PORT} (WS en /ws)`);
});
