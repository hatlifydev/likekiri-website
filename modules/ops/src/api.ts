const BASE = '/modules/ops/api';

export interface GitEstado {
  branch: string;
  dirty: number;
  remote: string;
  ahead: number;
  behind: number;
  lastDate: string | null;
  last: string;
}
export interface Backup {
  nombre: string;
  bytes: number;
  creadoEn: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function parse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let message = `error ${r.status}`;
    try {
      const d = (await r.json()) as { message?: string; detalle?: string };
      if (typeof d.message === 'string') message = d.message + (d.detalle ? ` — ${d.detalle}` : '');
    } catch {
      // genérico
    }
    throw new ApiError(r.status, message);
  }
  return (await r.json()) as T;
}

export const api = {
  gitEstado: async (): Promise<GitEstado> =>
    parse(await fetch(`${BASE}/git/estado`, { credentials: 'same-origin' })),
  commit: async (mensaje: string): Promise<{ resultado: string; detalle: string }> =>
    parse(
      await fetch(`${BASE}/git/commit`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mensaje }),
      }),
    ),
  push: async (): Promise<{ detalle: string }> =>
    parse(await fetch(`${BASE}/git/push`, { method: 'POST', credentials: 'same-origin' })),

  backups: async (): Promise<Backup[]> =>
    parse<{ backups: Backup[] }>(await fetch(`${BASE}/backups`, { credentials: 'same-origin' })).then((d) => d.backups),
  crearBackup: async (): Promise<Backup> =>
    parse<{ backup: Backup }>(
      await fetch(`${BASE}/backups`, { method: 'POST', credentials: 'same-origin' }),
    ).then((d) => d.backup),
  urlDescarga: (nombre: string): string => `${BASE}/backups/${encodeURIComponent(nombre)}`,
};
