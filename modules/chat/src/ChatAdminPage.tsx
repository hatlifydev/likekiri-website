import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

interface Conversacion {
  id: string;
  canal: string;
  estado: string;
  identidad: { tipo?: string; nombre: string | null; email: string | null } | null;
  noLeidosAgente: number;
  asignadoA: string | null;
  asignadoNombre: string | null;
  titulo: string | null;
  actualizadaEn: string;
}
interface Mensaje {
  id: string;
  autor: 'visitante' | 'agente' | 'bot';
  texto: string;
  autorNombre?: string | null;
  autorCargo?: string | null;
  creadoEn: string;
}
interface Yo { userId: string; isSuperadmin: boolean }
interface Agente { id: string; nombre: string; title: string | null }
interface Filtros { q: string; tipo: 'todos' | 'cliente' | 'anonimo'; desde: string; hasta: string }

const API = '/modules/chat/api';
const WS_URL = `wss://${typeof window !== 'undefined' ? window.location.host : 'admin.likekiri.com'}/modules/chat/ws?rol=agente`;
const LIMITE = 20;
const post = (path: string, body?: unknown): Promise<Response> =>
  fetch(`${API}${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });

/**
 * Panel de agente con dos secciones (por ruta):
 *  - /chat            → Conversaciones activas: atender, "Nuevo chat", "Guardar chat".
 *  - /chat/historial  → Historial: conversaciones guardadas (archivadas), con
 *                       editar título y borrar. Vista de solo lectura.
 * "Guardar chat" archiva la conversación y muestra un modal avisando que quedó
 * en el Historial de conversaciones.
 */
export function ChatAdminPage(): ReactElement {
  // El modo se lee de la ruta en cada render (la app re-renderiza al navegar).
  const modo: 'activo' | 'historial' =
    typeof window !== 'undefined' && window.location.pathname.includes('/historial') ? 'historial' : 'activo';
  const estadoFiltro = modo === 'historial' ? 'archivada' : 'abierta';

  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<Filtros>({ q: '', tipo: 'todos', desde: '', hasta: '' });
  const [activa, setActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'conectando' | 'en línea' | 'sin conexión'>('conectando');
  const [yo, setYo] = useState<Yo | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [transferirA, setTransferirA] = useState('');
  const [modalGuardado, setModalGuardado] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const activaRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef({ filtros, page, estadoFiltro });

  const cargarLista = useCallback((f: Filtros, p: number, est: string): void => {
    const params = new URLSearchParams({ estado: est, tipo: f.tipo, page: String(p), limit: String(LIMITE) });
    if (f.q.trim() !== '') params.set('q', f.q.trim());
    if (f.desde !== '') params.set('desde', f.desde);
    if (f.hasta !== '') params.set('hasta', f.hasta);
    fetch(`${API}/admin/conversaciones?${params.toString()}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('lista'))))
      .then((data: { conversaciones: Conversacion[]; total: number }) => {
        setConvs(data.conversaciones);
        setTotal(data.total);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    ctxRef.current = { filtros, page, estadoFiltro };
    const t = setTimeout(() => cargarLista(filtros, page, estadoFiltro), 250);
    return () => clearTimeout(t);
  }, [filtros, page, estadoFiltro, cargarLista]);

  // Al cambiar de sección, limpiar la selección.
  useEffect(() => {
    setActiva(null);
    setMensajes([]);
    setPage(1);
  }, [modo]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.json())
      .then((me: { userId: string; isSuperadmin: boolean }) => setYo({ userId: me.userId, isSuperadmin: me.isSuperadmin })).catch(() => undefined);
    fetch('/api/admin/agents', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : []))
      .then((list: Agente[]) => setAgentes(Array.isArray(list) ? list : [])).catch(() => undefined);

    let cerrado = false;
    let reintento: ReturnType<typeof setTimeout>;
    const refrescar = (): void => cargarLista(ctxRef.current.filtros, ctxRef.current.page, ctxRef.current.estadoFiltro);
    const conectar = (): void => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => !cerrado && setEstado('en línea');
      ws.onclose = () => { if (cerrado) return; setEstado('sin conexión'); reintento = setTimeout(conectar, 3000); };
      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data as string) as { tipo: string; convId?: string; mensaje?: Mensaje; asignadoA?: string | null; asignadoNombre?: string | null; yo?: Yo; mensajeTexto?: string };
        if (data.tipo === 'listo' && data.yo) setYo({ userId: data.yo.userId, isSuperadmin: data.yo.isSuperadmin });
        else if (data.tipo === 'nueva' || data.tipo === 'estado' || data.tipo === 'actualizada' || data.tipo === 'borrada') refrescar();
        else if (data.tipo === 'mensaje') { if (data.convId === activaRef.current && data.mensaje) setMensajes((prev) => [...prev, data.mensaje as Mensaje]); refrescar(); }
        else if (data.tipo === 'leido' && data.convId) setConvs((prev) => prev.map((c) => (c.id === data.convId ? { ...c, noLeidosAgente: 0 } : c)));
        else if (data.tipo === 'asignacion' && data.convId) setConvs((prev) => prev.map((c) => (c.id === data.convId ? { ...c, asignadoA: data.asignadoA ?? null, asignadoNombre: data.asignadoNombre ?? null } : c)));
        else if (data.tipo === 'error') { setAviso((data as { mensaje?: string }).mensaje ?? 'error'); setTimeout(() => setAviso(null), 4000); }
      };
    };
    conectar();
    return () => { cerrado = true; clearTimeout(reintento); wsRef.current?.close(); };
  }, [cargarLista]);

  useEffect(() => { activaRef.current = activa; }, [activa]);
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const enviarWs = (payload: object): void => {
    const ws = wsRef.current;
    if (ws !== null && ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  };
  const setFiltro = (c: Partial<Filtros>): void => { setPage(1); setFiltros((f) => ({ ...f, ...c })); };

  const abrir = (id: string): void => {
    setActiva(id);
    setTransferirA('');
    fetch(`${API}/admin/conversaciones/${id}`, { credentials: 'same-origin' }).then((r) => r.json())
      .then((data: { mensajes: Mensaje[] }) => setMensajes(data.mensajes)).catch(() => setMensajes([]));
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, noLeidosAgente: 0 } : c)));
    if (modo === 'activo') enviarWs({ tipo: 'ver', convId: id });
  };

  const responder = (): void => {
    const limpio = texto.trim();
    if (limpio === '' || activa === null) return;
    enviarWs({ tipo: 'responder', convId: activa, texto: limpio });
    setTexto('');
  };

  const nuevoChat = (): void => { setActiva(null); setMensajes([]); };

  const guardarChat = (): void => {
    if (activa === null) return;
    enviarWs({ tipo: 'archivar', convId: activa }); // archiva → pasa al historial
    setActiva(null);
    setMensajes([]);
    setModalGuardado(true);
    setTimeout(() => cargarLista(filtros, page, estadoFiltro), 300);
  };

  const editarTitulo = (c: Conversacion): void => {
    const actual = c.titulo ?? '';
    const nuevo = window.prompt('Título de la conversación:', actual);
    if (nuevo === null) return;
    void post(`/admin/conversaciones/${c.id}/titulo`, { titulo: nuevo }).then(() => cargarLista(filtros, page, estadoFiltro));
  };
  const borrarChat = (c: Conversacion): void => {
    if (!window.confirm(`¿Borrar definitivamente esta conversación${c.titulo ? ` («${c.titulo}»)` : ''}? No se puede deshacer.`)) return;
    void post(`/admin/conversaciones/${c.id}/borrar`).then(() => {
      if (activa === c.id) { setActiva(null); setMensajes([]); }
      cargarLista(filtros, page, estadoFiltro);
    });
  };

  const convActiva = convs.find((c) => c.id === activa) ?? null;
  const nombre = (c: Conversacion): string => c.titulo ?? c.identidad?.nombre ?? c.identidad?.email ?? `Visitante ${c.id.slice(0, 6)}`;
  const soyDueno = convActiva !== null && yo !== null && convActiva.asignadoA === yo.userId;
  const libre = convActiva !== null && convActiva.asignadoA === null;
  const deOtro = convActiva !== null && !libre && !soyDueno;
  const puedeResponder = modo === 'activo' && convActiva !== null && (libre || soyDueno);
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <>
      <h1>
        {modo === 'historial' ? 'Historial de conversaciones' : 'Conversaciones'}{' '}
        <span className="muted" style={{ fontSize: '0.9rem' }}>· {estado} · {total}</span>
      </h1>
      {aviso !== null && <p className="error" style={{ marginBottom: '0.75rem' }}>{aviso}</p>}

      <div className="panel" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', padding: '0.9rem 1rem' }}>
        <label style={{ flex: 2, minWidth: 180, margin: 0 }}>
          Buscar
          <input value={filtros.q} onChange={(e) => setFiltro({ q: e.target.value })} placeholder="nombre, correo, título…" />
        </label>
        <label style={{ margin: 0 }}>
          Tipo
          <select value={filtros.tipo} onChange={(e) => setFiltro({ tipo: e.target.value as Filtros['tipo'] })} style={{ width: 'auto' }}>
            <option value="todos">Todos</option><option value="cliente">Clientes</option><option value="anonimo">Anónimos</option>
          </select>
        </label>
        <label style={{ margin: 0 }}>Desde<input type="date" value={filtros.desde} onChange={(e) => setFiltro({ desde: e.target.value })} style={{ width: 'auto' }} /></label>
        <label style={{ margin: 0 }}>Hasta<input type="date" value={filtros.hasta} onChange={(e) => setFiltro({ hasta: e.target.value })} style={{ width: 'auto' }} /></label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', alignItems: 'start' }}>
        <div>
          <div className="panel" style={{ padding: '0.5rem', maxHeight: '62vh', overflowY: 'auto', marginBottom: '0.5rem' }}>
            {convs.length === 0 ? (
              <p className="muted" style={{ padding: '0.75rem' }}>
                {modo === 'historial' ? 'Aún no hay conversaciones guardadas.' : 'Sin conversaciones activas.'}
              </p>
            ) : (
              convs.map((c) => (
                <div key={c.id} className={activa === c.id ? 'conv-item activa' : 'conv-item'} onClick={() => abrir(c.id)}
                  style={{ cursor: 'pointer', padding: '0.6rem 0.75rem', borderRadius: 8, marginBottom: 2, background: activa === c.id ? 'rgba(46,139,87,0.14)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontSize: '0.92rem' }}>{nombre(c)}</strong>
                    {c.noLeidosAgente > 0 && <span className="chip mal">{c.noLeidosAgente}</span>}
                  </div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>
                    {c.identidad?.tipo === 'cliente' ? 'cliente' : 'anónimo'} · {new Date(c.actualizadaEn).toLocaleString('es-CL')}
                  </div>
                  {modo === 'historial' && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                      <button className="boton mini suave" onClick={(e) => { e.stopPropagation(); editarTitulo(c); }}>Editar</button>
                      <button className="boton mini peligro" onClick={(e) => { e.stopPropagation(); borrarChat(c); }}>Borrar</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <button className="boton mini suave" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Anterior</button>
            <span className="muted">Página {page} de {totalPaginas}</span>
            <button className="boton mini suave" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente ›</button>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '68vh' }}>
          {convActiva === null ? (
            <p className="muted">{modo === 'historial' ? 'Elige una conversación guardada para verla.' : 'Elige una conversación para responder.'}</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '0.6rem', borderBottom: '1px solid var(--lk-color-border)', marginBottom: '0.6rem' }}>
                <strong>{nombre(convActiva)}</strong>
                {modo === 'activo' ? (
                  <>
                    {libre && <span className="chip neutro">sin asignar</span>}
                    {libre && <button className="boton mini" onClick={() => enviarWs({ tipo: 'tomar', convId: convActiva.id })}>Tomar</button>}
                    {soyDueno && (
                      <>
                        <span className="chip ok">la atiendes tú</span>
                        <select value={transferirA} onChange={(e) => setTransferirA(e.target.value)} style={{ width: 'auto' }}>
                          <option value="">Transferir a…</option>
                          {agentes.filter((a) => a.id !== yo?.userId).map((a) => (<option key={a.id} value={a.id}>{a.nombre}{a.title != null ? ` · ${a.title}` : ''}</option>))}
                        </select>
                        <button className="boton mini suave" disabled={transferirA === ''} onClick={() => { const dest = agentes.find((a) => a.id === transferirA); if (!dest) return; enviarWs({ tipo: 'transferir', convId: convActiva.id, aUserId: dest.id, aNombre: dest.nombre }); setTransferirA(''); }}>Transferir</button>
                      </>
                    )}
                    {deOtro && (<><span className="chip mal">atiende {convActiva.asignadoNombre}</span>{yo?.isSuperadmin === true && <button className="boton mini peligro" onClick={() => enviarWs({ tipo: 'tomar', convId: convActiva.id })}>Forzar toma</button>}</>)}
                    <span style={{ flex: 1 }} />
                    <button className="boton mini suave" onClick={nuevoChat}>Nuevo chat</button>
                    <button className="boton mini" onClick={guardarChat}>Guardar chat</button>
                  </>
                ) : (
                  <>
                    <span className="chip neutro">guardada</span>
                    <span style={{ flex: 1 }} />
                    <button className="boton mini suave" onClick={() => editarTitulo(convActiva)}>Editar título</button>
                    <button className="boton mini peligro" onClick={() => borrarChat(convActiva)}>Borrar</button>
                  </>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {mensajes.map((m) => (
                  <div key={m.id} style={{ maxWidth: '75%', padding: '0.5rem 0.8rem', borderRadius: 12, fontSize: '0.92rem', alignSelf: m.autor === 'agente' ? 'flex-end' : 'flex-start', background: m.autor === 'agente' ? 'var(--lk-color-brand)' : 'var(--lk-color-background)', color: m.autor === 'agente' ? '#fff' : 'var(--lk-color-text)', border: m.autor === 'agente' ? 'none' : '1px solid var(--lk-color-border)' }}>
                    {m.autor !== 'visitante' && m.autorNombre != null && (<div style={{ fontSize: '0.7rem', opacity: 0.85, marginBottom: 2 }}>{m.autorNombre}{m.autorCargo != null ? ` · ${m.autorCargo}` : ''}</div>)}
                    {m.texto}
                  </div>
                ))}
                <div ref={finRef} />
              </div>

              {modo === 'activo' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && puedeResponder && responder()}
                    placeholder={deOtro ? `La atiende ${convActiva.asignadoNombre}` : libre ? 'Escribe y tomarás la conversación…' : 'Escribe tu respuesta…'}
                    disabled={!puedeResponder} style={{ flex: 1, opacity: puedeResponder ? 1 : 0.6 }} />
                  <button className="boton" onClick={responder} disabled={!puedeResponder}>Enviar</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalGuardado && (
        <div style={overlay} onClick={() => setModalGuardado(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '0.6rem' }}>Chat guardado</h2>
            <p style={{ color: 'var(--lk-color-textMuted)', marginBottom: '1.25rem' }}>
              La conversación se archivó en la sección <strong>«Historial de conversaciones»</strong>,
              donde podrás verla, editar su título o borrarla.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button className="boton suave" onClick={() => setModalGuardado(false)}>Seguir aquí</button>
              <button className="boton" onClick={() => { window.location.assign('/chat/historial'); }}>Ir al historial</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlay: import('react').CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(18,24,31,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem',
};
const modal: import('react').CSSProperties = {
  background: 'var(--lk-color-background)', border: '1px solid var(--lk-color-border)', borderRadius: 16, padding: '1.5rem', maxWidth: 440, width: '100%', boxShadow: '0 20px 50px rgba(18,24,31,0.3)',
};
