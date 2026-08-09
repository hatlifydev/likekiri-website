import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { api, ApiError, type CuentaAdmin } from './api';
import { PLANES, formatoCLP, type PlanId } from './planes';

/**
 * Página de admin del módulo clientes. Gestiona las MISMAS cuentas que se
 * crean desde el front (/clientes/registro): un solo dominio, dos superficies.
 * La autorización la valida el server del módulo delegando la sesión admin
 * en el core.
 */
export function CuentasAdminPage(): ReactElement {
  const [cuentas, setCuentas] = useState<CuentaAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((): void => {
    api
      .adminCuentas()
      .then(setCuentas)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'no se pudo cargar'),
      );
  }, []);

  useEffect(reload, [reload]);

  const cambiarPlan = async (cuenta: CuentaAdmin, plan: PlanId): Promise<void> => {
    try {
      await api.adminCambiarPlan(cuenta.id, plan);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo cambiar el plan');
    }
  };

  const cambiarEstado = async (cuenta: CuentaAdmin): Promise<void> => {
    const verbo = cuenta.activo ? 'suspender' : 'reactivar';
    if (!window.confirm(`¿${verbo} la cuenta de ${cuenta.email}?`)) return;
    try {
      await api.adminEstado(cuenta.id, !cuenta.activo);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'la acción falló');
    }
  };

  return (
    <>
      <h1>Clientes — Cuentas</h1>
      {error !== null && <p className="error">{error}</p>}
      <div className="panel">
        {cuentas === null ? (
          <p className="muted">Cargando…</p>
        ) : cuentas.length === 0 ? (
          <p className="muted">
            Aún no hay cuentas. Se crean desde el sitio público, en{' '}
            <a href="https://likekiri.com/clientes/registro" target="_blank" rel="noreferrer">
              /clientes/registro
            </a>
            .
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Facturas</th>
                <th>Pendiente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((cuenta) => (
                <tr key={cuenta.id}>
                  <td>
                    <strong>{cuenta.nombre}</strong>
                    <div className="muted">{cuenta.email}</div>
                  </td>
                  <td>
                    <span className="chip neutro">
                      {cuenta.tipo === 'empresa' ? 'empresa' : 'persona'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={cuenta.plan}
                      onChange={(e) => void cambiarPlan(cuenta, e.target.value as PlanId)}
                    >
                      {PLANES.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.nombre} — {formatoCLP(plan.precio)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`chip ${cuenta.activo ? 'ok' : 'mal'}`}>
                      {cuenta.activo ? 'activa' : 'suspendida'}
                    </span>
                  </td>
                  <td>{cuenta.facturas}</td>
                  <td>{cuenta.pendiente > 0 ? `$${cuenta.pendiente.toLocaleString('es-CL')}` : '—'}</td>
                  <td>
                    <button
                      className={`boton mini ${cuenta.activo ? 'peligro' : 'suave'}`}
                      onClick={() => void cambiarEstado(cuenta)}
                    >
                      {cuenta.activo ? 'Suspender' : 'Reactivar'}
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
