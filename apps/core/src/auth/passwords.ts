import * as argon2 from 'argon2';

import { isCommonPassword } from './common-passwords';

/**
 * Línea base OWASP para argon2id: 19 MiB de memoria, timeCost 2, parallelism 1.
 * argon2 genera un salt aleatorio único por hash e incrusta los parámetros en
 * el string resultante: dos usuarios con la misma contraseña producen hashes
 * distintos por construcción.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Hash de sacrificio: cuando el email no existe se verifica contra esto para
 * que el tiempo de respuesta no delate si la cuenta existe.
 */
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('contraseña-de-sacrificio-para-timing');
  return dummyHashPromise;
}

export const MIN_PASSWORD_LENGTH = 12;

/** Devuelve el mensaje de error, o null si la contraseña es aceptable. */
export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `la contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (password.length > 256) {
    return 'la contraseña no puede superar 256 caracteres';
  }
  if (isCommonPassword(password)) {
    return 'esa contraseña aparece en listas de contraseñas filtradas; elige otra';
  }
  return null;
}
