import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma HMAC del pull de manifests. Cada módulo tiene su clave propia: el core
 * firma la petición y el módulo la verifica, y viceversa en la respuesta.
 * Un secreto compartido entre módulos está prohibido (no hay forma de revocar
 * a uno solo). Solo para uso en Node — no importar desde código de navegador.
 */

/** Ventana de validez del timestamp, en segundos. */
export const SIGNATURE_WINDOW_SECONDS = 30;

export const HEADER_MODULE = 'x-likekiri-module';
export const HEADER_TIMESTAMP = 'x-likekiri-timestamp';
export const HEADER_SIGNATURE = 'x-likekiri-signature';

// type (no interface): así es asignable a Record<string, string> / HeadersInit.
export type SignedHeaders = {
  'x-likekiri-module': string;
  'x-likekiri-timestamp': string;
  'x-likekiri-signature': string;
};

/** hex de hmac_sha256(key, `${moduleId}.${timestamp}.${sha256(body)}`) */
export function computeSignature(
  key: string,
  moduleId: string,
  timestampSeconds: number,
  body: string | Uint8Array,
): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return createHmac('sha256', key)
    .update(`${moduleId}.${timestampSeconds}.${bodyHash}`)
    .digest('hex');
}

export function buildSignedHeaders(
  key: string,
  moduleId: string,
  body: string | Uint8Array,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SignedHeaders {
  return {
    [HEADER_MODULE]: moduleId,
    [HEADER_TIMESTAMP]: String(nowSeconds),
    [HEADER_SIGNATURE]: computeSignature(key, moduleId, nowSeconds, body),
  };
}

export interface VerifyInput {
  key: string;
  moduleId: string;
  body: string | Uint8Array;
  /** Valor del header x-likekiri-timestamp, tal cual llegó. */
  timestamp: string;
  /** Valor del header x-likekiri-signature, tal cual llegó. */
  signature: string;
  nowSeconds?: number;
  windowSeconds?: number;
}

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'timestamp-invalido' | 'timestamp-fuera-de-ventana' | 'firma-invalida';
    };

export function verifySignature(input: VerifyInput): VerifyResult {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const windowSeconds = input.windowSeconds ?? SIGNATURE_WINDOW_SECONDS;

  if (!/^\d+$/.test(input.timestamp)) {
    return { ok: false, reason: 'timestamp-invalido' };
  }
  const timestamp = Number(input.timestamp);
  if (Math.abs(now - timestamp) > windowSeconds) {
    return { ok: false, reason: 'timestamp-fuera-de-ventana' };
  }

  const expected = Buffer.from(
    computeSignature(input.key, input.moduleId, timestamp, input.body),
    'hex',
  );
  const provided = Buffer.from(input.signature, 'hex');
  // timingSafeEqual exige longitudes iguales; longitud distinta = firma inválida.
  if (provided.length !== expected.length) {
    return { ok: false, reason: 'firma-invalida' };
  }
  return timingSafeEqual(expected, provided)
    ? { ok: true }
    : { ok: false, reason: 'firma-invalida' };
}
