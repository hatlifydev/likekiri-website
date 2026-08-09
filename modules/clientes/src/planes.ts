/** Catálogo de planes. La fuente de verdad de precios vive en server.mjs. */
export type PlanId = 'gratis' | 'profesional' | 'empresa';

export interface Plan {
  id: PlanId;
  nombre: string;
  precio: number;
  descripcion: string;
}

export const PLANES: Plan[] = [
  {
    id: 'gratis',
    nombre: 'Gratis',
    precio: 0,
    descripcion: 'Simuladores, material público y boletín técnico.',
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 29_990,
    descripcion: 'Automatizaciones personales, asistente con tus documentos y soporte por correo.',
  },
  {
    id: 'empresa',
    nombre: 'Empresa',
    precio: 189_990,
    descripcion: 'Procesos a medida, SLA, cumplimiento y modelos on-premise.',
  },
];

export function formatoCLP(monto: number): string {
  return monto === 0 ? 'Gratis' : `$${monto.toLocaleString('es-CL')} /mes`;
}
