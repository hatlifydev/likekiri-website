import { createHash, randomBytes } from 'node:crypto';

/** Token opaco de 256 bits, apto para URL. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** En la base solo vive esto; el token plano jamás se guarda ni se loguea. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export const SESSION_COOKIE = '__Host-lk_session';

/** Parser mínimo del header Cookie (evita una dependencia para una llave). */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
