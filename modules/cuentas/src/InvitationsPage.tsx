import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from 'react';

import {
  api,
  ApiError,
  type AdminInvitation,
  type CreatedInvitation,
  type RoleOption,
} from './api';

const CHIP_POR_ESTADO: Record<AdminInvitation['status'], string> = {
  pendiente: 'neutro',
  aceptada: 'ok',
  revocada: 'mal',
  expirada: 'mal',
};

export function InvitationsPage(): ReactElement {
  const [invitations, setInvitations] = useState<AdminInvitation[] | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const reload = useCallback((): void => {
    api
      .invitations()
      .then(setInvitations)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'no se pudo cargar'),
      );
  }, []);

  useEffect(() => {
    reload();
    api
      .roles()
      .then((list) => {
        setRoles(list);
        if (list.length > 0 && roleId === '') setRoleId(list[0]?.id ?? '');
      })
      .catch(() => setRoles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  const crear = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopiado(false);
    try {
      const result = await api.createInvitation(email, roleId);
      setCreated(result);
      setEmail('');
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo crear la invitación');
    } finally {
      setBusy(false);
    }
  };

  const copiar = async (): Promise<void> => {
    if (created === null) return;
    try {
      await navigator.clipboard.writeText(created.acceptUrl);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const revocar = async (invitation: AdminInvitation): Promise<void> => {
    if (!window.confirm(`¿Revocar la invitación de ${invitation.email}?`)) return;
    try {
      await api.revokeInvitation(invitation.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo revocar');
    }
  };

  const reenviar = async (invitation: AdminInvitation): Promise<void> => {
    try {
      const result = await api.resendInvitation(invitation.id);
      setCreated(result);
      setCopiado(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo reenviar');
    }
  };

  return (
    <>
      <h1>Invitaciones</h1>
      {error !== null && <p className="error">{error}</p>}

      <div className="panel">
        <h2>Nueva invitación</h2>
        <form className="apilada" onSubmit={(e) => void crear(e)}>
          <div>
            <label htmlFor="inv-email">Correo del invitado</label>
            <input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="inv-role">Rol</label>
            <select id="inv-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <button className="boton" type="submit" disabled={busy || roleId === ''}>
            {busy ? 'Creando…' : 'Crear invitación'}
          </button>
        </form>
        {created !== null && (
          <div className="aviso" style={{ marginTop: '1rem' }}>
            Enlace de invitación (visible <strong>una sola vez</strong>, vence el{' '}
            {new Date(created.expiresAt).toLocaleString('es-CL')}):
            <div style={{ marginTop: '0.5rem' }}>
              <code>{created.acceptUrl}</code>
            </div>
            <button className="boton mini suave" style={{ marginTop: '0.5rem' }} onClick={() => void copiar()}>
              {copiado ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Historial</h2>
        {invitations === null ? (
          <p className="muted">Cargando…</p>
        ) : invitations.length === 0 ? (
          <p className="muted">Sin invitaciones todavía.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Vence</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.role}</td>
                  <td>
                    <span className={`chip ${CHIP_POR_ESTADO[invitation.status]}`}>
                      {invitation.status}
                    </span>
                  </td>
                  <td>{new Date(invitation.expiresAt).toLocaleString('es-CL')}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    {invitation.status === 'pendiente' && (
                      <button className="boton mini peligro" onClick={() => void revocar(invitation)}>
                        Revocar
                      </button>
                    )}
                    {(invitation.status === 'pendiente' || invitation.status === 'expirada') && (
                      <button className="boton mini suave" onClick={() => void reenviar(invitation)}>
                        Reenviar
                      </button>
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
