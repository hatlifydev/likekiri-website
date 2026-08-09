import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

interface Conversacion {
  id: string;
  canal: string;
  estado: string;
  identidad: { tipo?: string; nombre: string | null; email: string | null } | null;
  noLeidosAgente: number;
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

const API = '/modules/chat/api';
const WS_URL = `wss://${typeof window !== 'undefined' ? window.location.host : 'admin.likekiri.com'}/modules/chat/ws?rol=agente`;

/**
 * Panel de agente: lista de conversaciones con contador de no leídos y chat en
 * tiempo real por WebSocket. Recibe notificación (evento 'nueva'/'mensaje') de
 * mensajes entrantes aunque no tenga la conversación abierta.
 */
export function ChatAdminPage(): ReactElement {
  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [activa, setActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'conectando' | 'en línea' | 'sin conexión'>('conectando');
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
          | { tipo: 'listo' }
          | { tipo: 'nueva'; conv: Conversacion }
          | { tipo: 'mensaje'; convId: string; mensaje: Mensaje; conv?: Conversacion }
          | { tipo: 'leido'; convId: string };
        if (data.tipo === 'nueva') {
          setConvs((prev) => [data.conv, ...prev.filter((c) => c.id !== data.conv.id)]);
        } else if (data.tipo === 'mensaje') {
          if (data.convId === activaRef.current) {
            setMensajes((prev) => [...prev, data.mensaje]);
          }
          cargarLista();
        } else if (data.tipo === 'leido') {
          setConvs((prev) => prev.map((c) => (c.id === data.convId ? { ...c, noLeidosAgente: 0 } : c)));
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

  const abrir = (id: string): void => {
    setActiva(id);
    fetch(`${API}/admin/conversaciones/${id}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: { mensajes: Mensaje[] }) => setMensajes(data.mensajes))
      .catch(() => setMensajes([]));
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, noLeidosAgente: 0 } : c)));
    wsRef.current?.send(JSON.stringify({ tipo: 'ver', convId: id }));
  };

  const responder = (): void => {
    const limpio = texto.trim();
    const ws = wsRef.current;
    if (limpio === '' || activa === null || ws === null || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ tipo: 'responder', convId: activa, texto: limpio }));
    setTexto('');
  };

  const nombre = (c: Conversacion): string =>
    c.identidad?.nombre ?? c.identidad?.email ?? `Visitante ${c.id.slice(0, 6)}`;

  return (
    <>
      <h1>Conversaciones <span className="muted" style={{ fontSize: '0.9rem' }}>· {estado}</span></h1>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', alignItems: 'start' }}>
        <div className="panel" style={{ padding: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{nombre(c)}</strong>
                  {c.noLeidosAgente > 0 && <span className="chip mal">{c.noLeidosAgente}</span>}
                </div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>
                  {c.identidad?.tipo === 'cliente' ? 'cliente' : 'anónimo'} · {c.canal} ·{' '}
                  {new Date(c.actualizadaEn).toLocaleString('es-CL')}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
          {activa === null ? (
            <p className="muted">Elige una conversación para responder.</p>
          ) : (
            <>
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
                    {m.autor === 'bot' && <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>bot</div>}
                    {m.texto}
                  </div>
                ))}
                <div ref={finRef} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && responder()}
                  placeholder="Escribe tu respuesta…"
                  style={{ flex: 1 }}
                />
                <button className="boton" onClick={responder}>Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
