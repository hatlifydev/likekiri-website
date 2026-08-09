import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
} from 'react';

import { api, ApiError, subirConProgreso, type Archivo } from './api';

interface Subida {
  nombre: string;
  bytes: number;
  pct: number;
  estado: 'en cola' | 'subiendo' | 'procesando' | 'listo' | 'error';
  mensaje?: string;
}

/** Barra de progreso con estado por archivo. */
function BarraSubida({ subida }: { subida: Subida }): ReactElement {
  const color =
    subida.estado === 'error'
      ? 'var(--lk-color-danger)'
      : subida.estado === 'listo'
        ? '#16a34a'
        : 'var(--lk-color-brand)';
  const etiqueta =
    subida.estado === 'subiendo'
      ? `subiendo… ${subida.pct}%`
      : subida.estado === 'procesando'
        ? 'procesando en el servidor…'
        : subida.estado === 'listo'
          ? 'listo ✓'
          : subida.estado === 'error'
            ? `falló: ${subida.mensaje ?? 'error'}`
            : 'en cola';
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{subida.nombre}</span>
        <span style={{ color, whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>{etiqueta}</span>
      </div>
      <div style={{ height: '8px', borderRadius: '999px', background: 'var(--lk-color-border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${subida.estado === 'listo' || subida.estado === 'procesando' ? 100 : subida.pct}%`,
            background: color,
            borderRadius: '999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

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
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [recortando, setRecortando] = useState<Archivo | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [tolerancia, setTolerancia] = useState(8);
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
    const lista = Array.from(files);
    setSubiendo(true);
    setError(null);
    setSubidas(
      lista.map((file) => ({ nombre: file.name, bytes: file.size, pct: 0, estado: 'en cola' })),
    );
    const actualizar = (index: number, cambios: Partial<Subida>): void => {
      setSubidas((prev) => prev.map((s, i) => (i === index ? { ...s, ...cambios } : s)));
    };
    // Secuencial: cada archivo con su barra; la lista se refresca por archivo,
    // así lo ya subido aparece aunque el siguiente falle.
    for (let i = 0; i < lista.length; i += 1) {
      const file = lista[i] as File;
      actualizar(i, { estado: 'subiendo', pct: 0 });
      try {
        await subirConProgreso(file, (pct) => {
          actualizar(i, { pct, estado: pct >= 100 ? 'procesando' : 'subiendo' });
        });
        actualizar(i, { estado: 'listo', pct: 100 });
        reload();
      } catch (err) {
        actualizar(i, {
          estado: 'error',
          mensaje: err instanceof ApiError ? err.message : 'no se pudo subir',
        });
      }
    }
    setSubiendo(false);
    if (inputRef.current !== null) inputRef.current.value = '';
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
          <label className="muted" style={{ marginLeft: '1.25rem', fontSize: '0.85rem' }}>
            Tolerancia del quitar-fondo:{' '}
            <input
              type="number"
              min={1}
              max={60}
              value={tolerancia}
              onChange={(e) => setTolerancia(Math.min(60, Math.max(1, Number(e.target.value) || 8)))}
              style={{ width: '4.5rem', display: 'inline-block' }}
              title="1 = solo blanco casi puro (seguro para letras claras); más alto = come tonos más grises"
            />
          </label>
          {subidas.map((subida, index) => (
            <BarraSubida key={`${subida.nombre}-${index}`} subida={subida} />
          ))}
          {!subiendo && subidas.length > 0 && (
            <button
              className="boton mini suave"
              style={{ marginTop: '0.6rem' }}
              onClick={() => setSubidas([])}
            >
              Limpiar
            </button>
          )}
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
                      title={`Quita el blanco conectado a los bordes con tolerancia ${tolerancia} (respeta blancos interiores)`}
                      onClick={() => void accion(() => api.transparentar(archivo.id, tolerancia))}
                    >
                      Fondo transparente
                    </button>
                    <button
                      className="boton mini suave"
                      title="Recomprime en el mismo formato para reducir peso"
                      onClick={() => void accion(() => api.optimizar(archivo.id))}
                    >
                      Reducir peso
                    </button>
                    {!archivo.mime.includes('webp') && (
                      <button
                        className="boton mini suave"
                        title="Convierte a WebP (mejor peso, conserva transparencia)"
                        onClick={() => void accion(() => api.convertir(archivo.id))}
                      >
                        → WebP
                      </button>
                    )}
                  </>
                )}
                {archivo.tienePrev && (
                  <button
                    className="boton mini suave"
                    title="Deshace la última operación (recorte, fondo, optimización o conversión)"
                    onClick={() => void accion(() => api.deshacer(archivo.id))}
                  >
                    ↩ Deshacer
                  </button>
                )}
                {archivo.tieneOrig && (
                  <button
                    className="boton mini suave"
                    title="Vuelve al archivo tal como se subió"
                    onClick={() => void accion(() => api.original(archivo.id))}
                  >
                    Original
                  </button>
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
