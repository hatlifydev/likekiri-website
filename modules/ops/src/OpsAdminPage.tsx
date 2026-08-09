import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { api, ApiError, type Backup, type GitEstado } from './api';

const kb = (b: number): string => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);
const fecha = (iso: string | null): string => (iso === null ? '—' : new Date(iso).toLocaleString('es-CL'));

export function OpsAdminPage(): ReactElement {
  const [estado, setEstado] = useState<GitEstado | null>(null);
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback((): void => {
    api.gitEstado().then(setEstado).catch(() => setEstado(null));
    api.backups().then(setBackups).catch(() => setBackups([]));
  }, []);
  useEffect(cargar, [cargar]);

  const accion = async (nombre: string, fn: () => Promise<void>): Promise<void> => {
    setOcupado(nombre);
    setError(null);
    setAviso(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'la acción falló');
    } finally {
      setOcupado(null);
    }
  };

  const commit = (): Promise<void> =>
    accion('commit', async () => {
      const r = await api.commit(mensaje);
      setAviso(r.resultado === 'sin-cambios' ? 'No hay cambios que confirmar.' : `Commit creado: ${r.detalle}`);
      setMensaje('');
      cargar();
    });

  const push = (): Promise<void> =>
    accion('push', async () => {
      const r = await api.push();
      setAviso(`Push: ${r.detalle}`);
      cargar();
    });

  const respaldar = (): Promise<void> =>
    accion('backup', async () => {
      const b = await api.crearBackup();
      setAviso(`Respaldo creado: ${b.nombre} (${kb(b.bytes)})`);
      cargar();
    });

  return (
    <>
      <h1>Operaciones</h1>
      {error !== null && <p className="error">{error}</p>}
      {aviso !== null && <div className="aviso" style={{ marginBottom: '1rem' }}>{aviso}</div>}

      {/* ——— control de versiones ——— */}
      <div className="panel">
        <h2>Control de versiones (GitHub)</h2>
        {estado === null ? (
          <p className="muted">Cargando estado…</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <span>Rama: <strong>{estado.branch}</strong></span>
              <span>Cambios sin confirmar: <strong>{estado.dirty}</strong></span>
              <span>Por subir: <strong>{estado.ahead}</strong></span>
              <span>Remoto: {estado.remote !== '' ? <span className="chip ok">conectado</span> : <span className="chip mal">no conectado</span>}</span>
            </div>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Último commit: {estado.last} · {fecha(estado.lastDate)}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Mensaje del commit…"
                style={{ flex: 1, minWidth: 240 }}
              />
              <button className="boton" disabled={ocupado !== null || mensaje.trim() === ''} onClick={() => void commit()}>
                {ocupado === 'commit' ? 'Confirmando…' : 'Commit'}
              </button>
              <button className="boton suave" disabled={ocupado !== null || estado.remote === ''} onClick={() => void push()}>
                {ocupado === 'push' ? 'Subiendo…' : 'Push a GitHub'}
              </button>
            </div>
            {estado.remote === '' && (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                GitHub aún no está conectado. Un administrador debe configurar el remoto en el
                servidor (repositorio + credencial) para habilitar el push.
              </p>
            )}
          </>
        )}
      </div>

      {/* ——— respaldo de base de datos ——— */}
      <div className="panel">
        <h2>Respaldo de base de datos</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Genera un volcado completo (formato custom de PostgreSQL, restaurable con pg_restore).
          Se conservan los {20} respaldos más recientes.
        </p>
        <button className="boton" disabled={ocupado !== null} onClick={() => void respaldar()}>
          {ocupado === 'backup' ? 'Generando…' : 'Crear respaldo ahora'}
        </button>

        <div style={{ marginTop: '1.25rem' }}>
          {backups === null ? (
            <p className="muted">Cargando…</p>
          ) : backups.length === 0 ? (
            <p className="muted">Aún no hay respaldos.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.nombre}>
                    <td style={{ fontFamily: 'var(--lk-font-mono)', fontSize: '0.82rem' }}>{b.nombre}</td>
                    <td>{kb(b.bytes)}</td>
                    <td>{fecha(b.creadoEn)}</td>
                    <td><a className="boton mini suave" href={api.urlDescarga(b.nombre)}>Descargar</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
