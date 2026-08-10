export interface Me {
  email: string;
  userId: string;
  isSuperadmin: boolean;
  permissions: string[];
  lang: string;
}

export interface ShellRoute {
  moduleId: string;
  path: string;
  component: string;
  remoteEntry: string;
  ssr: 'shell' | null;
}

export interface ShellMenuChild {
  label: string;
  path: string;
  icon: string | null;
  order: number;
}

export interface ShellMenuEntry {
  moduleId: string;
  slot: string;
  label: string;
  icon: string | null;
  order: number;
  /** Hoja: enlace directo. null cuando la entrada es un submenú. */
  path: string | null;
  /** 'expanded' (siempre abierto) o 'toggle' (plegable); null en hojas. */
  mode: 'expanded' | 'toggle' | null;
  children: ShellMenuChild[];
}

export interface ShellManifest {
  contractVersion: string;
  surface: 'web' | 'admin';
  routes: ShellRoute[];
  menu: ShellMenuEntry[];
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
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    let message = `error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (typeof data.message === 'string') message = data.message;
      else if (Array.isArray(data.message)) message = data.message.join(', ');
    } catch {
      // cuerpo no-JSON: se queda el mensaje genérico
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const api = {
  me: () => request<Me>('/api/auth/me'),
  login: (email: string, password: string) => post<{ ok: true }>('/api/auth/login', { email, password }),
  logout: () => post<{ ok: true }>('/api/auth/logout', {}),
  setLang: (lang: 'es' | 'en') => post<{ ok: true; lang: string }>('/api/auth/lang', { lang }),
  invitationPeek: (token: string) =>
    request<{ email: string }>(`/api/auth/invitation?token=${encodeURIComponent(token)}`),
  acceptInvite: (token: string, password: string) =>
    post<{ ok: true; email: string }>('/api/auth/accept-invite', { token, password }),
  manifest: () => request<ShellManifest>('/api/shell/manifest?surface=admin'),
};
