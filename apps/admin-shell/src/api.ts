export interface Me {
  email: string;
  userId: string;
  isSuperadmin: boolean;
  permissions: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  activeSessions: number;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  status: 'pendiente' | 'aceptada' | 'revocada' | 'expirada';
}

export interface RoleOption {
  id: string;
  key: string;
  label: string;
}

export interface CreatedInvitation {
  id: string;
  acceptUrl: string;
  expiresAt: string;
}

export interface ModuleStatus {
  moduleId: string;
  name: string | null;
  version: string | null;
  syncedAt: string | null;
  ok: boolean;
  errors: string[];
}

export interface ShellRoute {
  moduleId: string;
  path: string;
  component: string;
  remoteEntry: string;
  ssr: 'shell' | null;
}

export interface ShellMenuEntry {
  moduleId: string;
  slot: string;
  label: string;
  icon: string | null;
  order: number;
  path: string;
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
  invitationPeek: (token: string) =>
    request<{ email: string }>(`/api/auth/invitation?token=${encodeURIComponent(token)}`),
  acceptInvite: (token: string, password: string) =>
    post<{ ok: true; email: string }>('/api/auth/accept-invite', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword }),
  manifest: () => request<ShellManifest>('/api/shell/manifest?surface=admin'),
  users: () => request<AdminUser[]>('/api/admin/users'),
  disableUser: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/disable`, {}),
  enableUser: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/enable`, {}),
  revokeSessions: (id: string) =>
    post<{ ok: true; revoked: number }>(`/api/admin/users/${id}/revoke-sessions`, {}),
  roles: () => request<RoleOption[]>('/api/admin/roles'),
  invitations: () => request<AdminInvitation[]>('/api/admin/invitations'),
  createInvitation: (email: string, roleId: string) =>
    post<CreatedInvitation>('/api/admin/invitations', { email, roleId }),
  revokeInvitation: (id: string) => post<{ ok: true }>(`/api/admin/invitations/${id}/revoke`, {}),
  resendInvitation: (id: string) =>
    post<CreatedInvitation>(`/api/admin/invitations/${id}/resend`, {}),
  registry: () => request<ModuleStatus[]>('/api/admin/registry'),
};
