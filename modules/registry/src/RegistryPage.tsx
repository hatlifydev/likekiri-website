import { useEffect, useState, type ReactElement } from 'react';

interface ModuleStatus {
  moduleId: string;
  name: string | null;
  version: string | null;
  syncedAt: string | null;
  ok: boolean;
  errors: string[];
}

async function fetchRegistry(): Promise<ModuleStatus[]> {
  const response = await fetch('/api/admin/registry', { credentials: 'same-origin' });
  if (!response.ok) {
    let message = `error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (typeof data.message === 'string') message = data.message;
    } catch {
      // cuerpo no-JSON: mensaje genérico
    }
    throw new Error(message);
  }
  return (await response.json()) as ModuleStatus[];
}

export function RegistryPage(): ReactElement {
  const [modules, setModules] = useState<ModuleStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistry()
      .then(setModules)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'no se pudo cargar'),
      );
  }, []);

  return (
    <>
      <h1>Registry de módulos</h1>
      {error !== null && <p className="error">{error}</p>}
      <div className="panel">
        {modules === null ? (
          <p className="muted">Cargando…</p>
        ) : modules.length === 0 ? (
          <p className="muted">
            No hay módulos configurados. El core arranca sano sin ellos: eso es
            exactamente lo que promete la arquitectura.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Versión</th>
                <th>Última sincronización</th>
                <th>Estado</th>
                <th>Errores del último pull</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.moduleId}>
                  <td>
                    <strong>{mod.moduleId}</strong>
                    {mod.name !== null && mod.name !== mod.moduleId ? ` — ${mod.name}` : ''}
                  </td>
                  <td>{mod.version ?? '—'}</td>
                  <td>
                    {mod.syncedAt === null ? '—' : new Date(mod.syncedAt).toLocaleString('es-CL')}
                  </td>
                  <td>
                    <span className={`chip ${mod.ok ? 'ok' : 'mal'}`}>
                      {mod.ok ? 'sincronizado' : 'con errores'}
                    </span>
                  </td>
                  <td>
                    {mod.errors.length === 0 ? (
                      '—'
                    ) : (
                      <ul style={{ paddingLeft: '1rem' }}>
                        {mod.errors.map((message) => (
                          <li key={message} className="error">
                            {message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
