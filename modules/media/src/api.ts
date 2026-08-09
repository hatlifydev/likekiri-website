const BASE = '/modules/media/api';

export interface Archivo {
  id: string;
  nombre: string;
  mime: string;
  bytes: number;
  ancho: number | null;
  alto: number | null;
  creadoEn: string;
  actualizadoEn: string;
  url: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (typeof data.message === 'string') message = data.message;
    } catch {
      // mensaje genérico
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export const api = {
  listar: async (): Promise<Archivo[]> =>
    parse(await fetch(`${BASE}/archivos`, { credentials: 'same-origin' })),

  subir: async (file: File): Promise<Archivo> =>
    parse(
      await fetch(`${BASE}/archivos?nombre=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': file.type },
        body: file,
      }),
    ),

  recortar: async (
    id: string,
    rect: { x: number; y: number; ancho: number; alto: number },
  ): Promise<Archivo> =>
    parse(
      await fetch(`${BASE}/archivos/${id}/recortar`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rect),
      }),
    ),

  transparentar: async (id: string): Promise<Archivo> =>
    parse(
      await fetch(`${BASE}/archivos/${id}/transparentar`, {
        method: 'POST',
        credentials: 'same-origin',
      }),
    ),

  borrar: async (id: string): Promise<void> => {
    await parse(
      await fetch(`${BASE}/archivos/${id}`, { method: 'DELETE', credentials: 'same-origin' }),
    );
  },
};
