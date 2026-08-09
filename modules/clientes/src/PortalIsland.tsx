import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { api, ApiError, type MiCuenta } from './api';
import { PLANES, formatoCLP, type PlanId } from './planes';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'anonimo' }
  | { fase: 'dentro'; datos: MiCuenta };

/**
 * Isla pública: el portal del cliente. Muestra plan, estado y facturación, y
 * permite cambiar de plan o cerrar sesión. Si no hay sesión de cliente,
 * ofrece acceso/registro (la isla decide; el SSR solo puso el placeholder).
 */
export function PortalIsland(): ReactElement {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [planNuevo, setPlanNuevo] = useState<PlanId | ''>('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback((): void => {
    api
      .miCuenta()
      .then((datos) => setEstado({ fase: 'dentro', datos }))
      .catch(() => setEstado({ fase: 'anonimo' }));
  }, []);

  useEffect(cargar, [cargar]);

  if (estado.fase === 'cargando') {
    return <p style={{ color: 'var(--lk-color-textMuted)' }}>Cargando tu cuenta…</p>;
  }

  if (estado.fase === 'anonimo') {
    return (
      <section style={{ maxWidth: '30rem' }}>
        <h1>Portal de clientes</h1>
        <p style={{ color: 'var(--lk-color-textMuted)', margin: '0.75rem 0 1.5rem' }}>
          Necesitas una sesión activa para ver tu cuenta.
        </p>
        <p style={{ display: 'flex', gap: '0.75rem' }}>
          <a className="boton" href="/clientes/acceso">
            Iniciar sesión
          </a>
          <a className="boton secundario" href="/clientes/registro">
            Crear cuenta
          </a>
        </p>
      </section>
    );
  }

  const { cuenta, facturas } = estado.datos;
  const plan = PLANES.find((p) => p.id === cuenta.plan);

  const cambiar = async (): Promise<void> => {
    if (planNuevo === '' || planNuevo === cuenta.plan) return;
    setError(null);
    try {
      const datos = await api.cambiarPlan(planNuevo);
      setEstado({ fase: 'dentro', datos });
      setPlanNuevo('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo cambiar el plan');
    }
  };

  const salir = async (): Promise<void> => {
    await api.salir().catch(() => undefined);
    window.location.href = '/clientes/acceso';
  };

  return (
    <section style={{ maxWidth: '40rem' }}>
      <h1 style={{ letterSpacing: '-0.02em' }}>Hola, {cuenta.nombre}</h1>
      <p style={{ color: 'var(--lk-color-textMuted)', margin: '0.5rem 0 1.5rem' }}>
        {cuenta.email} · cliente desde {new Date(cuenta.creadaEn).toLocaleDateString('es-CL')}
      </p>

      <div
        style={{
          border: '1px solid var(--lk-color-border)',
          borderRadius: 'var(--lk-radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          background: 'var(--lk-color-surface)',
        }}
      >
        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lk-color-brand)', fontWeight: 600 }}>
          Plan contratado
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
          {plan?.nombre ?? cuenta.plan}{' '}
          <span style={{ fontSize: '1rem', color: 'var(--lk-color-textMuted)', fontWeight: 400 }}>
            {plan ? formatoCLP(plan.precio) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select
            value={planNuevo}
            onChange={(e) => setPlanNuevo(e.target.value as PlanId | '')}
            style={{ padding: '0.5rem', border: '1px solid var(--lk-color-border)', borderRadius: 'var(--lk-radius-md)', font: 'inherit' }}
          >
            <option value="">Cambiar de plan…</option>
            {PLANES.filter((p) => p.id !== cuenta.plan).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {formatoCLP(p.precio)}
              </option>
            ))}
          </select>
          <button className="boton" onClick={() => void cambiar()} disabled={planNuevo === ''}>
            Confirmar cambio
          </button>
        </div>
        {error !== null && (
          <div style={{ color: 'var(--lk-color-danger)', marginTop: '0.5rem' }}>{error}</div>
        )}
      </div>

      <h2 style={{ marginBottom: '0.75rem' }}>Facturación</h2>
      {facturas.length === 0 ? (
        <p style={{ color: 'var(--lk-color-textMuted)' }}>Sin movimientos todavía.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              {['Fecha', 'Concepto', 'Monto', 'Estado'].map((h) => (
                <th key={h} style={celda(true)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.map((factura) => (
              <tr key={factura.id}>
                <td style={celda()}>{new Date(factura.fecha).toLocaleDateString('es-CL')}</td>
                <td style={celda()}>{factura.concepto}</td>
                <td style={celda()}>${factura.monto.toLocaleString('es-CL')}</td>
                <td style={celda()}>
                  <span style={{ color: factura.estado === 'pagada' ? 'var(--lk-color-brand)' : 'var(--lk-color-accent)', fontWeight: 600 }}>
                    {factura.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: '2rem' }}>
        <button className="boton secundario" onClick={() => void salir()}>
          Cerrar sesión
        </button>
      </p>
    </section>
  );
}

function celda(header = false): import('react').CSSProperties {
  return {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--lk-color-border)',
    ...(header ? { color: 'var(--lk-color-textMuted)', fontWeight: 600 } : {}),
  };
}
