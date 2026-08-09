/**
 * Cliente HTTP propio del módulo (mismo origen que el admin). Un módulo no
 * comparte código con el shell: solo el contrato y las APIs del core.
 */

export interface Ficha {
  displayName: string | null;
  firstName: string | null;
  title: string | null;
  bio: string | null;
  initials: string | null;
  enEquipo: boolean;
  teamOrder: number;
}

export interface AdminUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  activeSessions: number;
  ficha: Ficha;
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
      // cuerpo no-JSON: mensaje genérico
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const api = {
  users: () => request<AdminUser[]>('/api/admin/users'),
  disableUser: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/disable`, {}),
  enableUser: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/enable`, {}),
  revokeSessions: (id: string) =>
    post<{ ok: true; revoked: number }>(`/api/admin/users/${id}/revoke-sessions`, {}),
  guardarFicha: (id: string, ficha: Ficha) =>
    post<{ ok: true }>(`/api/admin/users/${id}/ficha`, ficha),
  roles: () => request<RoleOption[]>('/api/admin/roles'),
  invitations: () => request<AdminInvitation[]>('/api/admin/invitations'),
  createInvitation: (email: string, roleId: string) =>
    post<CreatedInvitation>('/api/admin/invitations', { email, roleId }),
  revokeInvitation: (id: string) => post<{ ok: true }>(`/api/admin/invitations/${id}/revoke`, {}),
  resendInvitation: (id: string) =>
    post<CreatedInvitation>(`/api/admin/invitations/${id}/resend`, {}),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword }),
};
