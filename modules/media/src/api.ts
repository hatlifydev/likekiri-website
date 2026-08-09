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

/**
 * Subida con progreso real: XMLHttpRequest expone upload.onprogress
 * (fetch no puede). pct llega 0–100; al 100 el servidor aún procesa.
 */
export function subirConProgreso(
  file: File,
  onProgress: (pct: number) => void,
): Promise<Archivo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/archivos?nombre=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.timeout = 10 * 60_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as Archivo);
        return;
      }
      let message = `error ${xhr.status}`;
      try {
        const data = JSON.parse(xhr.responseText) as { message?: string };
        if (typeof data.message === 'string') message = data.message;
      } catch {
        // mensaje genérico
      }
      reject(new ApiError(xhr.status, message));
    };
    xhr.onerror = () => reject(new ApiError(0, 'conexión interrumpida — revisa tu red y reintenta'));
    xhr.ontimeout = () => reject(new ApiError(0, 'tiempo de espera agotado (10 min)'));
    xhr.send(file);
  });
}

export const api = {
  listar: async (): Promise<Archivo[]> =>
    parse(await fetch(`${BASE}/archivos`, { credentials: 'same-origin' })),

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
