import { useEffect, useState, type ReactElement } from 'react';

/**
 * Página de ejemplo de la superficie admin.
 *
 * Qué demuestra:
 *  - Una página federada montada por la SPA cuando la ruta del manifest
 *    coincide (/ejemplo-admin).
 *  - Llamadas a la API del core por el mismo origen (aquí /api/health);
 *    las mutaciones (POST/…) llevan Origin automáticamente (CSRF del core).
 *  - Uso de las clases CSS del shell (panel, tarjeta, chip…) y de los design
 *    tokens; no dependas de nada más del shell.
 */
export function PanelPage(): ReactElement {
  const [uptime, setUptime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { uptime: number };
        setUptime(data.uptime);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'no se pudo consultar'),
      );
  }, []);

  return (
    <>
      <h1>Ejemplo — Panel</h1>
      <div className="panel">
        <h2>Este contenido lo sirve un módulo federado</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          El shell del admin no sabe que esta página existe: la descubrió por el
          manifest, comprobó tus permisos en el servidor y cargó el componente
          por Module Federation.
        </p>
        <div className="tarjetas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <h2>Estado del core</h2>
            {error !== null ? (
              <span className="chip mal">sin respuesta</span>
            ) : uptime === null ? (
              <span className="chip neutro">consultando…</span>
            ) : (
              <>
                <span className="chip ok">en línea</span>
                <p className="muted" style={{ marginTop: '0.5rem' }}>
                  uptime: {Math.floor(uptime / 60)} min
                </p>
              </>
            )}
          </div>
          <div className="panel" style={{ marginBottom: 0 }}>
            <h2>Permiso en uso</h2>
            <p className="muted">
              Estás viendo esto porque tu sesión tiene{' '}
              <code>ejemplo-admin.read</code>, declarado por este módulo en su
              propio namespace.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
