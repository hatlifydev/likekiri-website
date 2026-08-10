import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { api, ApiError, type AdminUser, type Ficha } from './api';

function fecha(value: string | null): string {
  if (value === null) return '—';
  return new Date(value).toLocaleString('es-CL');
}

/** Editor de la ficha de una cuenta: nombre, cargo y detalle (mismo del front). */
function EditorFicha({
  user,
  onGuardar,
  onCerrar,
}: {
  user: AdminUser;
  onGuardar: (ficha: Ficha) => Promise<void>;
  onCerrar: () => void;
}): ReactElement {
  const [ficha, setFicha] = useState<Ficha>(user.ficha);
  const [busy, setBusy] = useState(false);
  const set = (campo: keyof Ficha, valor: string | boolean | number): void =>
    setFicha((f) => ({ ...f, [campo]: valor }));

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    try {
      await onGuardar(ficha);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2>Ficha de {user.ficha.displayName ?? user.email}</h2>
      <form className="apilada" onSubmit={(e) => void submit(e)} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ flex: 2, minWidth: 200 }}>
            Nombre para mostrar
            <input value={ficha.displayName ?? ''} onChange={(e) => set('displayName', e.target.value)} placeholder="Pedro Miguras" />
          </label>
          <label style={{ flex: 1, minWidth: 120 }}>
            Primer nombre
            <input value={ficha.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} placeholder="Pedro" />
          </label>
        </div>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: '-0.4rem' }}>
          El primer nombre y el cargo firman las respuestas del chat.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ flex: 3, minWidth: 220 }}>
            Cargo
            <input value={ficha.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Socio fundador" />
          </label>
          <label style={{ flex: 1, minWidth: 90 }}>
            Iniciales
            <input value={ficha.initials ?? ''} maxLength={4} onChange={(e) => set('initials', e.target.value.toUpperCase())} placeholder="PM" />
          </label>
        </div>
        <label>
          Detalle (aparece en la ficha del sitio)
          <textarea
            value={ficha.bio ?? ''}
            onChange={(e) => set('bio', e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '0.55rem 0.7rem', border: '1px solid var(--lk-color-border)', borderRadius: 'var(--lk-radius-md)', font: 'inherit', background: 'var(--lk-color-background)', color: 'var(--lk-color-text)' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={ficha.enEquipo} onChange={(e) => set('enEquipo', e.target.checked)} style={{ width: 'auto' }} />
            Mostrar en la página de equipo del sitio
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            Orden
            <input type="number" min={0} max={999} value={ficha.teamOrder} onChange={(e) => set('teamOrder', Number(e.target.value) || 0)} style={{ width: 80 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="boton" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ficha'}</button>
          <button className="boton suave" type="button" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export function UsersPage(): ReactElement {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<AdminUser | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

  const reload = useCallback((): void => {
    api.users().then(setUsers).catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'no se pudo cargar'));
  }, []);
  useEffect(reload, [reload]);

  const accion = async (fn: () => Promise<unknown>, confirmacion: string): Promise<void> => {
    if (!window.confirm(confirmacion)) return;
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'la acción falló');
    }
  };

  const guardarFicha = async (id: string, ficha: Ficha): Promise<void> => {
    try {
      await api.guardarFicha(id, ficha);
      setEditando(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo guardar la ficha');
    }
  };

  return (
    <>
      <h1>Usuarios</h1>
      {error !== null && <p className="error">{error}</p>}

      {editando !== null && (
        <EditorFicha user={editando} onGuardar={(f) => guardarFicha(editando.id, f)} onCerrar={() => setEditando(null)} />
      )}

      <div className="panel">
        {users === null ? (
          <p className="muted">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="muted">Aún no hay usuarios. Crea una invitación.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Cargo</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{user.ficha.displayName ?? '—'}</strong>
                      {user.ficha.bio != null && user.ficha.bio !== '' && (
                        <button
                          className="ayuda"
                          title="Ver el detalle de la ficha (el mismo del sitio)"
                          aria-label="Ver ficha"
                          onClick={() => setDetalle(detalle === user.id ? null : user.id)}
                        >
                          ?
                        </button>
                      )}
                      {user.ficha.enEquipo && <span className="chip ok" style={{ fontSize: '0.68rem' }}>equipo</span>}
                    </div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>{user.email}</div>
                    {detalle === user.id && (
                      <div className="aviso" style={{ marginTop: '0.5rem', maxWidth: 420 }}>
                        {user.ficha.bio}
                      </div>
                    )}
                  </td>
                  <td>{user.ficha.title ?? '—'}</td>
                  <td>
                    <span className={`chip ${user.status === 'ACTIVE' ? 'ok' : 'mal'}`}>
                      {user.status === 'ACTIVE' ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td>{user.roles.join(', ') || '—'}</td>
                  <td>{fecha(user.lastLoginAt)}</td>
                  <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button className="boton mini suave" onClick={() => setEditando(user)}>Ficha</button>
                    {user.status === 'ACTIVE' ? (
                      <button className="boton mini peligro" onClick={() => void accion(() => api.disableUser(user.id), `¿Desactivar a ${user.email}? Sus sesiones se revocan.`)}>Desactivar</button>
                    ) : (
                      <button className="boton mini suave" onClick={() => void accion(() => api.enableUser(user.id), `¿Reactivar a ${user.email}?`)}>Reactivar</button>
                    )}
                    <button className="boton mini suave" onClick={() => void accion(() => api.revokeSessions(user.id), `¿Cerrar todas las sesiones de ${user.email}?`)}>Revocar sesiones</button>
                    <button
                      className="boton mini peligro"
                      onClick={() => {
                        const escrito = window.prompt(`Esto BORRA la cuenta de ${user.email} de forma permanente. Escribe su correo para confirmar:`);
                        if (escrito === null) return;
                        if (escrito.trim().toLowerCase() !== user.email.toLowerCase()) {
                          setError('el correo no coincide; no se borró nada');
                          return;
                        }
                        void accion(() => api.borrarUser(user.id), `¿Borrar definitivamente a ${user.email}?`);
                      }}
                    >
                      Borrar
                    </button>
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
