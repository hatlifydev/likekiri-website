import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { api, ApiError, type AdminUser } from './api';

function fecha(value: string | null): string {
  if (value === null) return '—';
  return new Date(value).toLocaleString('es-CL');
}

export function UsersPage(): ReactElement {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((): void => {
    api
      .users()
      .then(setUsers)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'no se pudo cargar'),
      );
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

  return (
    <>
      <h1>Usuarios</h1>
      {error !== null && <p className="error">{error}</p>}
      <div className="panel">
        {users === null ? (
          <p className="muted">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="muted">Aún no hay usuarios. Crea una invitación.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Correo</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Último acceso</th>
                <th>Sesiones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <span className={`chip ${user.status === 'ACTIVE' ? 'ok' : 'mal'}`}>
                      {user.status === 'ACTIVE' ? 'activo' : 'desactivado'}
                    </span>
                  </td>
                  <td>{user.roles.join(', ') || '—'}</td>
                  <td>{fecha(user.lastLoginAt)}</td>
                  <td>{user.activeSessions}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    {user.status === 'ACTIVE' ? (
                      <button
                        className="boton mini peligro"
                        onClick={() =>
                          void accion(
                            () => api.disableUser(user.id),
                            `¿Desactivar a ${user.email}? Sus sesiones se revocan.`,
                          )
                        }
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        className="boton mini suave"
                        onClick={() =>
                          void accion(() => api.enableUser(user.id), `¿Reactivar a ${user.email}?`)
                        }
                      >
                        Reactivar
                      </button>
                    )}
                    <button
                      className="boton mini suave"
                      onClick={() =>
                        void accion(
                          () => api.revokeSessions(user.id),
                          `¿Cerrar todas las sesiones de ${user.email}?`,
                        )
                      }
                    >
                      Revocar sesiones
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
