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

// — productos (subcategorías) y clientes de producto —
export type Ciclo = 'mensual' | 'trimestral' | 'anual' | 'bianual' | 'lifetime';
export const CICLOS: Array<{ id: Ciclo; nombre: string }> = [
  { id: 'mensual', nombre: 'Mensual' },
  { id: 'trimestral', nombre: 'Trimestral' },
  { id: 'anual', nombre: 'Anual' },
  { id: 'bianual', nombre: 'Bianual' },
  { id: 'lifetime', nombre: 'Lifetime' },
];

export interface PlanCatalogo {
  id: string;
  clave: string;
  nombre: string;
  precio: number;
  features: string[];
  ciclosPermitidos: Ciclo[];
  activo: boolean;
}

export interface ProductoAdmin {
  slug: string;
  nombre: string;
  planes: PlanCatalogo[]; // planes del catálogo asociados y activos
  planIdsAsociados: string[];
  apiKey: string;
  origenesPermitidos: string[];
  autoAltaFree: boolean;
  clientes: number;
}

export interface ClienteProducto {
  id: string;
  nombre: string;
  email: string;
  plan: string;
  producto: string | null;
  cicloFacturacion: Ciclo | null;
  inicioVigencia: string | null;
  finVigencia: string | null;
  firebaseUid: string | null;
  vigente: boolean;
  activo: boolean;
  creadaEn: string;
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
const put = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
const del = <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' });

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

  // — productos (subcategorías) y clientes de producto —
  adminProductos: () => request<ProductoAdmin[]>('/admin/productos'),
  adminRotarApiKey: (slug: string) => post<{ apiKey: string }>(`/admin/productos/${slug}/rotar-apikey`, {}),
  adminActualizarProducto: (slug: string, origenesPermitidos: string[], autoAltaFree?: boolean) =>
    put<{ ok: true; origenesPermitidos: string[] }>(`/admin/productos/${slug}`, { origenesPermitidos, autoAltaFree }),
  adminClientesDeProducto: (slug: string) => request<ClienteProducto[]>(`/admin/cuentas?producto=${encodeURIComponent(slug)}`),
  adminCrearCliente: (datos: {
    nombre: string;
    email: string;
    producto: string;
    plan: string;
    cicloFacturacion: Ciclo;
    inicioVigencia?: string;
  }) => post<{ ok: true; id: string }>('/admin/cuentas', datos),
  adminEditarCliente: (
    id: string,
    datos: { plan?: string; cicloFacturacion?: Ciclo; inicioVigencia?: string; activo?: boolean },
  ) => put<ClienteProducto>(`/admin/cuentas/${id}`, datos),
  adminEliminarCliente: (id: string) => del<{ ok: true }>(`/admin/cuentas/${id}`),

  // — generador: catálogo global de planes + asociación a productos —
  adminPlanes: () => request<PlanCatalogo[]>('/admin/planes'),
  adminCrearPlan: (datos: {
    clave: string;
    nombre: string;
    precio: number;
    features: string[];
    ciclosPermitidos: Ciclo[];
    activo: boolean;
  }) => post<{ ok: true; id: string }>('/admin/planes', datos),
  adminEditarPlan: (
    id: string,
    datos: { nombre?: string; precio?: number; features?: string[]; ciclosPermitidos?: Ciclo[]; activo?: boolean },
  ) => put<PlanCatalogo>(`/admin/planes/${id}`, datos),
  adminEliminarPlan: (id: string) => del<{ ok: true }>(`/admin/planes/${id}`),
  adminAsociarPlanes: (slug: string, planIds: string[]) =>
    put<{ ok: true; planIdsAsociados: string[] }>(`/admin/productos/${slug}/planes`, { planIds }),
};
