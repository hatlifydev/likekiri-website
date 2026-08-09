import type { PlanId, TipoCuenta } from './planes';

/**
 * Cliente HTTP del módulo. La API es DEL MÓDULO (server.mjs), no del core:
 * Caddy la expone bajo /modules/clientes/api en ambos orígenes, así que la
 * misma ruta relativa sirve para las islas del front (likekiri.com) y para
 * las páginas del admin (admin.likekiri.com), cada una con su propia sesión.
 */
const BASE = '/modules/clientes/api';

export interface Cuenta {
  id: string;
  nombre: string;
  email: string;
  plan: PlanId;
  tipo: TipoCuenta;
  activo: boolean;
  creadaEn: string;
}

export interface Factura {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  estado: 'pagada' | 'pendiente';
}

export interface MiCuenta {
  cuenta: Cuenta;
  facturas: Factura[];
}

export interface CuentaAdmin extends Cuenta {
  facturas: number;
  pendiente: number;
}

export interface FacturaAdmin extends Factura {
  email: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    let message = `error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (typeof data.message === 'string') message = data.message;
    } catch {
      // cuerpo no-JSON: mensaje genérico
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const api = {
  // — cliente (superficie web, sesión propia del módulo) —
  registro: (datos: { nombre: string; email: string; password: string; plan: PlanId; tipo: TipoCuenta }) =>
    post<{ ok: true }>('/registro', datos),
  acceso: (email: string, password: string) => post<{ ok: true }>('/acceso', { email, password }),
  salir: () => post<{ ok: true }>('/salir', {}),
  miCuenta: () => request<MiCuenta>('/mi-cuenta'),
  cambiarPlan: (plan: PlanId) => post<MiCuenta>('/cambiar-plan', { plan }),

  // — administración (sesión del admin, validada por el módulo contra el core) —
  adminCuentas: () => request<CuentaAdmin[]>('/admin/cuentas'),
  adminFacturas: () => request<FacturaAdmin[]>('/admin/facturas'),
  adminCambiarPlan: (id: string, plan: PlanId) =>
    post<{ ok: true }>(`/admin/cuentas/${id}/plan`, { plan }),
  adminEstado: (id: string, activo: boolean) =>
    post<{ ok: true }>(`/admin/cuentas/${id}/estado`, { activo }),
};
