import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

interface Mensaje {
  id: string;
  autor: 'visitante' | 'agente' | 'bot';
  texto: string;
  autorNombre?: string | null;
  autorCargo?: string | null;
  creadoEn: string;
}

const API = '/modules/chat/api';
const WS_URL = `wss://${typeof window !== 'undefined' ? window.location.host : 'likekiri.com'}/modules/chat/ws`;

/**
 * Widget de chat flotante. Inicia sesión de visitante (HTTP, fija cookie),
 * abre WebSocket y conversa en tiempo real. Anónimo o, si el visitante tiene
 * sesión de cliente, se identifica solo (mejor esfuerzo del backend).
 */
export function ChatWidgetIsland(): ReactElement {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'conectando' | 'en línea' | 'sin conexión'>('conectando');
  const [identidad, setIdentidad] = useState<{ nombre: string | null } | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const convRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Inicia sesión y abre WS una sola vez.
  useEffect(() => {
    let cerrado = false;
    let reintento: ReturnType<typeof setTimeout>;

    const conectar = (convId: string): void => {
      const ws = new WebSocket(`${WS_URL}?conv=${encodeURIComponent(convId)}`);
      wsRef.current = ws;
      ws.onopen = () => !cerrado && setEstado('en línea');
      ws.onclose = () => {
        if (cerrado) return;
        setEstado('sin conexión');
        reintento = setTimeout(() => conectar(convId), 3000); // reconexión
      };
      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data as string) as
          | { tipo: 'historial'; mensajes: Mensaje[] }
          | { tipo: 'mensaje'; mensaje: Mensaje };
        if (data.tipo === 'historial') setMensajes(data.mensajes);
        else if (data.tipo === 'mensaje') {
          setMensajes((prev) => [...prev, data.mensaje]);
          if (data.mensaje.autor !== 'visitante') {
            setNoLeidos((n) => (abiertoRef.current ? 0 : n + 1));
          }
        }
      };
    };

    fetch(`${API}/sesion`, { method: 'POST', credentials: 'same-origin', headers: { origin: window.location.origin } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sesión'))))
      .then((data: { conversacion: { id: string }; identidad: { nombre: string | null } | null; historial: Mensaje[] }) => {
        if (cerrado) return;
        convRef.current = data.conversacion.id;
        setIdentidad(data.identidad);
        setMensajes(data.historial);
        conectar(data.conversacion.id);
      })
      .catch(() => setEstado('sin conexión'));

    return () => {
      cerrado = true;
      clearTimeout(reintento);
      wsRef.current?.close();
    };
  }, []);

  // ref espejo de "abierto" para el handler de WS
  const abiertoRef = useRef(false);
  useEffect(() => {
    abiertoRef.current = abierto;
    if (abierto) setNoLeidos(0);
  }, [abierto]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto]);

  const enviar = (): void => {
    const limpio = texto.trim();
    const ws = wsRef.current;
    if (limpio === '' || ws === null || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ tipo: 'mensaje', texto: limpio }));
    setTexto('');
  };

  return (
    <div style={contenedor}>
      {abierto && (
        <div style={panel}>
          <div style={cabecera}>
            <div>
              <strong>Conversemos</strong>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {estado}
                {identidad?.nombre != null ? ` · ${identidad.nombre}` : ''}
              </div>
            </div>
            <button style={cerrar} onClick={() => setAbierto(false)} aria-label="Cerrar chat">
              ✕
            </button>
          </div>
          <div style={cuerpo}>
            {mensajes.length === 0 ? (
              <p style={{ color: '#8b97a2', fontSize: '0.9rem' }}>
                Hola 👋 Escríbenos y te respondemos aquí mismo.
              </p>
            ) : (
              mensajes.map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.autor === 'visitante' ? 'flex-end' : 'flex-start' }}>
                  {m.autor !== 'visitante' && m.autorNombre != null && (
                    <span style={{ fontSize: '0.72rem', color: '#5b6674', margin: '0 0.3rem 2px' }}>
                      {m.autorNombre}{m.autorCargo != null ? ` · ${m.autorCargo}` : ''}
                    </span>
                  )}
                  <div style={{ ...burbuja, ...(m.autor === 'visitante' ? propia : ajena) }}>{m.texto}</div>
                </div>
              ))
            )}
            <div ref={finRef} />
          </div>
          <div style={pie}>
            <input
              style={entrada}
              value={texto}
              placeholder="Escribe un mensaje…"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') enviar();
              }}
            />
            <button style={botonEnviar} onClick={enviar} aria-label="Enviar">
              ➤
            </button>
          </div>
        </div>
      )}
      <button style={burbujaBoton} onClick={() => setAbierto((v) => !v)} aria-label="Abrir chat">
        {abierto ? '▾' : '💬'}
        {!abierto && noLeidos > 0 && <span style={badge}>{noLeidos}</span>}
      </button>
    </div>
  );
}

const VERDE = '#2e8b57';
const OSCURO = '#12181f';
const contenedor: CSSProperties = { position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 9999, fontFamily: 'system-ui, sans-serif' };
const burbujaBoton: CSSProperties = {
  width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: VERDE, color: '#fff', fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(46,139,87,0.45)', position: 'relative',
};
const badge: CSSProperties = {
  position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 5px',
  borderRadius: 999, background: '#d99b3b', color: '#12181f', fontSize: '0.72rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const panel: CSSProperties = {
  position: 'absolute', right: 0, bottom: 74, width: 'min(360px, calc(100vw - 2.5rem))', height: 'min(500px, 70vh)',
  background: '#fff', borderRadius: 18, boxShadow: '0 20px 50px rgba(18,24,31,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const cabecera: CSSProperties = { background: OSCURO, color: '#fff', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cerrar: CSSProperties = { background: 'transparent', border: 'none', color: '#c6cfd8', cursor: 'pointer', fontSize: '1rem' };
const cuerpo: CSSProperties = { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f4f6f8' };
const burbuja: CSSProperties = { maxWidth: '80%', padding: '0.55rem 0.8rem', borderRadius: 14, fontSize: '0.92rem', lineHeight: 1.4, wordBreak: 'break-word' };
const propia: CSSProperties = { alignSelf: 'flex-end', background: VERDE, color: '#fff', borderBottomRightRadius: 4 };
const ajena: CSSProperties = { alignSelf: 'flex-start', background: '#fff', color: '#1d2630', border: '1px solid #e2e7ec', borderBottomLeftRadius: 4 };
const pie: CSSProperties = { display: 'flex', gap: '0.5rem', padding: '0.7rem', borderTop: '1px solid #e2e7ec', background: '#fff' };
const entrada: CSSProperties = { flex: 1, border: '1px solid #e2e7ec', borderRadius: 999, padding: '0.55rem 0.9rem', font: 'inherit', outline: 'none' };
const botonEnviar: CSSProperties = { border: 'none', background: VERDE, color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' };
