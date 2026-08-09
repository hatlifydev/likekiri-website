import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

interface Conversacion {
  id: string;
  canal: string;
  estado: string;
  identidad: { tipo?: string; nombre: string | null; email: string | null } | null;
  noLeidosAgente: number;
  asignadoA: string | null;
  asignadoNombre: string | null;
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
interface Yo {
  userId: string;
  isSuperadmin: boolean;
}
interface Agente {
  id: string;
  nombre: string;
  title: string | null;
}

const API = '/modules/chat/api';
const WS_URL = `wss://${typeof window !== 'undefined' ? window.location.host : 'admin.likekiri.com'}/modules/chat/ws?rol=agente`;

/**
 * Panel de agente con ASIGNACIÓN EXCLUSIVA: la primera respuesta (o "Tomar")
 * asigna la conversación a ese agente; mientras esté asignada, solo él puede
 * responder. Puede transferirla a otro agente o liberarla. El superadmin puede
 * forzar la toma. La regla se aplica en el servidor; la UI solo la refleja.
 */
export function ChatAdminPage(): ReactElement {
  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [activa, setActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'conectando' | 'en línea' | 'sin conexión'>('conectando');
  const [yo, setYo] = useState<Yo | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [transferirA, setTransferirA] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const activaRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const cargarLista = useCallback((): void => {
    fetch(`${API}/admin/conversaciones`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('lista'))))
      .then((data: { conversaciones: Conversacion[] }) => setConvs(data.conversaciones))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    cargarLista();
    // Identidad propia y roster de agentes (endpoints del core).
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((me: { userId: string; isSuperadmin: boolean }) => setYo({ userId: me.userId, isSuperadmin: me.isSuperadmin }))
      .catch(() => undefined);
    fetch('/api/admin/agents', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Agente[]) => setAgentes(Array.isArray(list) ? list : []))
      .catch(() => undefined);

    let cerrado = false;
    let reintento: ReturnType<typeof setTimeout>;
    const conectar = (): void => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => !cerrado && setEstado('en línea');
      ws.onclose = () => {
        if (cerrado) return;
        setEstado('sin conexión');
        reintento = setTimeout(conectar, 3000);
      };
      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data as string) as
          | { tipo: 'listo'; yo: { userId: string; isSuperadmin: boolean } }
          | { tipo: 'nueva'; conv: Conversacion }
          | { tipo: 'mensaje'; convId: string; mensaje: Mensaje; conv?: Conversacion }
          | { tipo: 'leido'; convId: string }
          | { tipo: 'asignacion'; convId: string; asignadoA: string | null; asignadoNombre: string | null }
          | { tipo: 'error'; convId: string; mensaje: string };
        if (data.tipo === 'listo') {
          setYo({ userId: data.yo.userId, isSuperadmin: data.yo.isSuperadmin });
        } else if (data.tipo === 'nueva') {
          setConvs((prev) => [data.conv, ...prev.filter((c) => c.id !== data.conv.id)]);
        } else if (data.tipo === 'mensaje') {
          if (data.convId === activaRef.current) setMensajes((prev) => [...prev, data.mensaje]);
          cargarLista();
        } else if (data.tipo === 'leido') {
          setConvs((prev) => prev.map((c) => (c.id === data.convId ? { ...c, noLeidosAgente: 0 } : c)));
        } else if (data.tipo === 'asignacion') {
          setConvs((prev) =>
            prev.map((c) =>
              c.id === data.convId ? { ...c, asignadoA: data.asignadoA, asignadoNombre: data.asignadoNombre } : c,
            ),
          );
        } else if (data.tipo === 'error') {
          setAviso(data.mensaje);
          setTimeout(() => setAviso(null), 4000);
        }
      };
    };
    conectar();
    return () => {
      cerrado = true;
      clearTimeout(reintento);
      wsRef.current?.close();
    };
  }, [cargarLista]);

  useEffect(() => {
    activaRef.current = activa;
  }, [activa]);
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviarWs = (payload: object): void => {
    const ws = wsRef.current;
    if (ws !== null && ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  };

  const abrir = (id: string): void => {
    setActiva(id);
    setTransferirA('');
    fetch(`${API}/admin/conversaciones/${id}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: { mensajes: Mensaje[] }) => setMensajes(data.mensajes))
      .catch(() => setMensajes([]));
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, noLeidosAgente: 0 } : c)));
    enviarWs({ tipo: 'ver', convId: id });
  };

  const responder = (): void => {
    const limpio = texto.trim();
    if (limpio === '' || activa === null) return;
    enviarWs({ tipo: 'responder', convId: activa, texto: limpio });
    setTexto('');
  };

  const convActiva = convs.find((c) => c.id === activa) ?? null;
  const nombre = (c: Conversacion): string =>
    c.identidad?.nombre ?? c.identidad?.email ?? `Visitante ${c.id.slice(0, 6)}`;

  const soyDueno = convActiva !== null && yo !== null && convActiva.asignadoA === yo.userId;
  const libre = convActiva !== null && convActiva.asignadoA === null;
  const deOtro = convActiva !== null && !libre && !soyDueno;
  const puedeResponder = convActiva !== null && (libre || soyDueno);

  return (
    <>
      <h1>
        Conversaciones <span className="muted" style={{ fontSize: '0.9rem' }}>· {estado}</span>
      </h1>
      {aviso !== null && <p className="error" style={{ marginBottom: '0.75rem' }}>{aviso}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '1rem', alignItems: 'start' }}>
        <div className="panel" style={{ padding: '0.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {convs.length === 0 ? (
            <p className="muted" style={{ padding: '0.75rem' }}>Sin conversaciones todavía.</p>
          ) : (
            convs.map((c) => (
              <button
                key={c.id}
                onClick={() => abrir(c.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: activa === c.id ? 'rgba(46,139,87,0.14)' : 'transparent',
                  color: 'inherit', padding: '0.6rem 0.75rem', borderRadius: 8, marginBottom: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{nombre(c)}</strong>
                  {c.noLeidosAgente > 0 && <span className="chip mal">{c.noLeidosAgente}</span>}
                </div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>
                  {c.identidad?.tipo === 'cliente' ? 'cliente' : 'anónimo'} ·{' '}
                  {c.asignadoNombre != null ? (
                    <span style={{ color: yo?.userId === c.asignadoA ? 'var(--lk-color-brand)' : 'var(--lk-color-accent)' }}>
                      {yo?.userId === c.asignadoA ? 'la atiendes tú' : `atiende ${c.asignadoNombre}`}
                    </span>
                  ) : (
                    <span>sin asignar</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '72vh' }}>
          {convActiva === null ? (
            <p className="muted">Elige una conversación para responder.</p>
          ) : (
            <>
              {/* barra de asignación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '0.6rem', borderBottom: '1px solid var(--lk-color-border)', marginBottom: '0.6rem' }}>
                {libre && (
                  <>
                    <span className="chip neutro">sin asignar</span>
                    <button className="boton mini" onClick={() => enviarWs({ tipo: 'tomar', convId: convActiva.id })}>
                      Tomar conversación
                    </button>
                  </>
                )}
                {soyDueno && (
                  <>
                    <span className="chip ok">la atiendes tú</span>
                    <select value={transferirA} onChange={(e) => setTransferirA(e.target.value)} style={{ width: 'auto' }}>
                      <option value="">Transferir a…</option>
                      {agentes
                        .filter((a) => a.id !== yo?.userId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}{a.title != null ? ` · ${a.title}` : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      className="boton mini suave"
                      disabled={transferirA === ''}
                      onClick={() => {
                        const dest = agentes.find((a) => a.id === transferirA);
                        if (dest === undefined) return;
                        enviarWs({ tipo: 'transferir', convId: convActiva.id, aUserId: dest.id, aNombre: dest.nombre });
                        setTransferirA('');
                      }}
                    >
                      Transferir
                    </button>
                    <button className="boton mini suave" onClick={() => enviarWs({ tipo: 'liberar', convId: convActiva.id })}>
                      Liberar
                    </button>
                  </>
                )}
                {deOtro && (
                  <>
                    <span className="chip mal">atiende {convActiva.asignadoNombre}</span>
                    {yo?.isSuperadmin === true && (
                      <button className="boton mini peligro" onClick={() => enviarWs({ tipo: 'tomar', convId: convActiva.id })}>
                        Forzar toma
                      </button>
                    )}
                  </>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {mensajes.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      maxWidth: '75%', padding: '0.5rem 0.8rem', borderRadius: 12, fontSize: '0.92rem',
                      alignSelf: m.autor === 'agente' ? 'flex-end' : 'flex-start',
                      background: m.autor === 'agente' ? 'var(--lk-color-brand)' : 'var(--lk-color-background)',
                      color: m.autor === 'agente' ? '#fff' : 'var(--lk-color-text)',
                      border: m.autor === 'agente' ? 'none' : '1px solid var(--lk-color-border)',
                    }}
                  >
                    {m.autor !== 'visitante' && m.autorNombre != null && (
                      <div style={{ fontSize: '0.7rem', opacity: 0.85, marginBottom: 2 }}>
                        {m.autorNombre}{m.autorCargo != null ? ` · ${m.autorCargo}` : ''}
                      </div>
                    )}
                    {m.texto}
                  </div>
                ))}
                <div ref={finRef} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && puedeResponder && responder()}
                  placeholder={deOtro ? `La atiende ${convActiva.asignadoNombre}` : libre ? 'Escribe y tomarás la conversación…' : 'Escribe tu respuesta…'}
                  disabled={!puedeResponder}
                  style={{ flex: 1, opacity: puedeResponder ? 1 : 0.6 }}
                />
                <button className="boton" onClick={responder} disabled={!puedeResponder}>Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
