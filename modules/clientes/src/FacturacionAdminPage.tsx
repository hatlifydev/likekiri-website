import { useEffect, useState, type ReactElement } from 'react';

import { api, ApiError, type FacturaAdmin } from './api';

export function FacturacionAdminPage(): ReactElement {
  const [facturas, setFacturas] = useState<FacturaAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminFacturas()
      .then(setFacturas)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'no se pudo cargar'),
      );
  }, []);

  const total = (facturas ?? [])
    .filter((factura) => factura.estado === 'pendiente')
    .reduce((sum, factura) => sum + factura.monto, 0);

  return (
    <>
      <h1>Clientes — Facturación</h1>
      {error !== null && <p className="error">{error}</p>}
      <div className="panel">
        {facturas === null ? (
          <p className="muted">Cargando…</p>
        ) : facturas.length === 0 ? (
          <p className="muted">Sin facturas todavía.</p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              {facturas.length} facturas ·{' '}
              {total > 0
                ? `$${total.toLocaleString('es-CL')} pendientes de pago`
                : 'nada pendiente de pago'}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => (
                  <tr key={factura.id}>
                    <td>{new Date(factura.fecha).toLocaleDateString('es-CL')}</td>
                    <td>{factura.email}</td>
                    <td>{factura.concepto}</td>
                    <td>${factura.monto.toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`chip ${factura.estado === 'pagada' ? 'ok' : 'neutro'}`}>
                        {factura.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
