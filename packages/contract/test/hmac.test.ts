import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSignedHeaders,
  verifySignature,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
} from '../src/hmac';

const KEY = 'clave-de-prueba-larga-0123456789abcdef';
const NOW = 1_754_661_600;

describe('firma HMAC', () => {
  test('roundtrip: lo firmado verifica', () => {
    const body = JSON.stringify({ hola: 'mundo' });
    const headers = buildSignedHeaders(KEY, 'hello', body, NOW);
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body,
      timestamp: headers[HEADER_TIMESTAMP],
      signature: headers[HEADER_SIGNATURE],
      nowSeconds: NOW + 5,
    });
    assert.deepEqual(result, { ok: true });
  });

  test('rechaza un cuerpo manipulado', () => {
    const headers = buildSignedHeaders(KEY, 'hello', '{"a":1}', NOW);
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body: '{"a":2}',
      timestamp: headers[HEADER_TIMESTAMP],
      signature: headers[HEADER_SIGNATURE],
      nowSeconds: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: 'firma-invalida' });
  });

  test('rechaza una clave distinta (cada módulo tiene la suya)', () => {
    const headers = buildSignedHeaders('otra-clave-igual-de-larga-xxxxxxxxxxxx', 'hello', '', NOW);
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body: '',
      timestamp: headers[HEADER_TIMESTAMP],
      signature: headers[HEADER_SIGNATURE],
      nowSeconds: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: 'firma-invalida' });
  });

  test('rechaza un timestamp fuera de la ventana de 30s', () => {
    const headers = buildSignedHeaders(KEY, 'hello', '', NOW);
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body: '',
      timestamp: headers[HEADER_TIMESTAMP],
      signature: headers[HEADER_SIGNATURE],
      nowSeconds: NOW + 31,
    });
    assert.deepEqual(result, { ok: false, reason: 'timestamp-fuera-de-ventana' });
  });

  test('rechaza timestamps que no son números', () => {
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body: '',
      timestamp: 'ayer',
      signature: '00',
      nowSeconds: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: 'timestamp-invalido' });
  });

  test('rechaza firmas con longitud incorrecta sin lanzar', () => {
    const result = verifySignature({
      key: KEY,
      moduleId: 'hello',
      body: '',
      timestamp: String(NOW),
      signature: 'abcd',
      nowSeconds: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: 'firma-invalida' });
  });
});
