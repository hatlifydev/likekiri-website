import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
} from 'react';

import { api, ApiError, type Archivo } from './api';

/** Fondo ajedrez para que la transparencia se vea. */
const AJEDREZ: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 8px 8px',
  backgroundColor: '#fff',
};

const kb = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Editor de recorte: arrastra sobre la imagen para seleccionar. */
function Recortador({
  archivo,
  onListo,
  onCancelar,
}: {
  archivo: Archivo;
  onListo: () => void;
  onCancelar: () => void;
}): ReactElement {
  const imgRef = useRef<HTMLImageElement>(null);
  const [sel, setSel] = useState<Rect | null>(null);
  const [arrastrando, setArrastrando] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const coords = (event: MouseEvent): { x: number; y: number } => {
    const img = imgRef.current;
    if (img === null) return { x: 0, y: 0 };
    const box = img.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(event.clientY - box.top, 0), box.height),
    };
  };

  const aplicar = async (): Promise<void> => {
    const img = imgRef.current;
    if (img === null || sel === null || sel.w < 4 || sel.h < 4) return;
    const escala = img.naturalWidth / img.getBoundingClientRect().width;
    setBusy(true);
    setError(null);
    try {
      await api.recortar(archivo.id, {
        x: Math.round(sel.x * escala),
        y: Math.round(sel.y * escala),
        ancho: Math.round(sel.w * escala),
        alto: Math.round(sel.h * escala),
      });
      onListo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo recortar');
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2>Recortar: {archivo.nombre}</h2>
      <p className="muted" style={{ marginBottom: '0.75rem' }}>
        Arrastra sobre la imagen para seleccionar el área que quieres conservar.
      </p>
      <div
        style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', ...AJEDREZ, cursor: 'crosshair', userSelect: 'none' }}
        onMouseDown={(e) => {
          const p = coords(e);
          setArrastrando(p);
          setSel({ x: p.x, y: p.y, w: 0, h: 0 });
        }}
        onMouseMove={(e) => {
          if (arrastrando === null) return;
          const p = coords(e);
          setSel({
            x: Math.min(arrastrando.x, p.x),
            y: Math.min(arrastrando.y, p.y),
            w: Math.abs(p.x - arrastrando.x),
            h: Math.abs(p.y - arrastrando.y),
          });
        }}
        onMouseUp={() => setArrastrando(null)}
        onMouseLeave={() => setArrastrando(null)}
      >
        <img
          ref={imgRef}
          src={`${archivo.url}?v=${archivo.actualizadoEn}`}
          alt={archivo.nombre}
          style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', pointerEvents: 'none' }}
        />
        {sel !== null && sel.w > 2 && (
          <div
            style={{
              position: 'absolute',
              left: sel.x,
              top: sel.y,
              width: sel.w,
              height: sel.h,
              border: '2px dashed var(--lk-color-brand)',
              background: 'rgba(15, 118, 110, 0.15)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {error !== null && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
        <button className="boton" onClick={() => void aplicar()} disabled={busy || sel === null || sel.w < 4}>
          {busy ? 'Recortando…' : 'Aplicar recorte'}
        </button>
        <button className="boton suave" onClick={onCancelar} disabled={busy}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function MediaPage(): ReactElement {
  const [archivos, setArchivos] = useState<Archivo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [recortando, setRecortando] = useState<Archivo | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback((): void => {
    api
      .listar()
      .then(setArchivos)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'no se pudo cargar'),
      );
  }, []);

  useEffect(reload, [reload]);

  const subir = async (files: FileList | null): Promise<void> => {
    if (files === null || files.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await api.subir(file);
      }
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo subir');
    } finally {
      setSubiendo(false);
      if (inputRef.current !== null) inputRef.current.value = '';
    }
  };

  const accion = async (fn: () => Promise<unknown>): Promise<void> => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'la acción falló');
    }
  };

  const copiarUrl = async (archivo: Archivo): Promise<void> => {
    const absoluta = `https://likekiri.com${archivo.url}`;
    try {
      await navigator.clipboard.writeText(absoluta);
      setCopiado(archivo.id);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      window.prompt('Copia la URL:', absoluta);
    }
  };

  const editable = (archivo: Archivo): boolean =>
    archivo.mime !== 'image/svg+xml' && !archivo.mime.includes('icon');

  return (
    <>
      <h1>Multimedia</h1>
      {error !== null && <p className="error">{error}</p>}

      {recortando !== null ? (
        <Recortador
          archivo={recortando}
          onListo={() => {
            setRecortando(null);
            reload();
          }}
          onCancelar={() => setRecortando(null)}
        />
      ) : (
        <div className="panel">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => void subir(e.target.files)}
          />
          <button className="boton" onClick={() => inputRef.current?.click()} disabled={subiendo}>
            {subiendo ? 'Subiendo…' : '⬆ Subir archivos'}
          </button>
          <span className="muted" style={{ marginLeft: '0.75rem' }}>
            PNG, JPG, WEBP, SVG o ICO — máx. 15 MB.
          </span>
        </div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}
      >
        {archivos === null ? (
          <p className="muted">Cargando…</p>
        ) : archivos.length === 0 ? (
          <p className="muted">Biblioteca vacía. Sube tu primer archivo (el logo, por ejemplo).</p>
        ) : (
          archivos.map((archivo) => (
            <div key={archivo.id} className="panel" style={{ marginBottom: 0, padding: '0.9rem' }}>
              <div
                style={{ ...AJEDREZ, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', overflow: 'hidden', marginBottom: '0.6rem' }}
              >
                <img
                  src={`${archivo.url}?v=${archivo.actualizadoEn}`}
                  alt={archivo.nombre}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                {archivo.nombre}
              </div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                {archivo.ancho !== null ? `${archivo.ancho}×${archivo.alto} · ` : ''}
                {kb(archivo.bytes)}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button className="boton mini suave" onClick={() => void copiarUrl(archivo)}>
                  {copiado === archivo.id ? 'Copiada ✓' : 'Copiar URL'}
                </button>
                {editable(archivo) && (
                  <>
                    <button className="boton mini suave" onClick={() => setRecortando(archivo)}>
                      Recortar
                    </button>
                    <button
                      className="boton mini suave"
                      title="Quita el fondo blanco conectado a los bordes (respeta blancos interiores)"
                      onClick={() => void accion(() => api.transparentar(archivo.id))}
                    >
                      Fondo transparente
                    </button>
                  </>
                )}
                <button
                  className="boton mini peligro"
                  onClick={() => {
                    if (window.confirm(`¿Borrar ${archivo.nombre}?`)) {
                      void accion(() => api.borrar(archivo.id));
                    }
                  }}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
