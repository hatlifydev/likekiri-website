import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CONTRACT_VERSION, validateManifest } from '../src/index';

const ALLOWED = { allowedRemoteOrigins: ['https://cdn.likekiri.com'] };

function baseManifest(): Record<string, unknown> {
  return {
    contractVersion: '1',
    moduleId: 'hello',
    name: 'Hello',
    version: '0.1.0',
    namespace: 'hello',
    remoteEntry: 'https://cdn.likekiri.com/hello/remoteEntry.js',
    exposes: ['./HelloIsland', './HelloAdminPage'],
    routes: [
      {
        surface: 'web',
        path: '/hello/:slug',
        component: './HelloIsland',
        ssr: 'shell',
        permissions: [],
      },
      {
        surface: 'admin',
        path: '/hello',
        component: './HelloAdminPage',
        permissions: ['hello.read'],
      },
    ],
    menu: [
      {
        surface: 'admin',
        slot: 'sidebar',
        label: 'Hello',
        icon: 'sparkles',
        order: 30,
        path: '/hello',
      },
    ],
    permissions: [
      { key: 'hello.read', label: 'Ver Hello' },
      { key: 'hello.write', label: 'Editar Hello' },
    ],
  };
}

function expectRejected(manifest: unknown, fragment: string): void {
  const result = validateManifest(manifest, ALLOWED);
  assert.equal(result.ok, false, 'el manifest debería ser rechazado');
  if (!result.ok) {
    assert.ok(
      result.errors.some((e) => e.includes(fragment)),
      `esperaba un error con "${fragment}", hubo: ${result.errors.join(' | ')}`,
    );
  }
}

test('el contrato declara la versión 1', () => {
  assert.equal(CONTRACT_VERSION, '1');
});

describe('validateManifest', () => {
  test('acepta el manifest de ejemplo del brief', () => {
    const result = validateManifest(baseManifest(), ALLOWED);
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  test('acepta una ruta admin igual al namespace desnudo (/hello)', () => {
    const result = validateManifest(baseManifest(), ALLOWED);
    assert.ok(result.ok && result.manifest.routes[1]?.path === '/hello');
  });

  test('rechaza contractVersion fuera del rango soportado', () => {
    expectRejected({ ...baseManifest(), contractVersion: '99' }, 'contractVersion');
  });

  test('rechaza una ruta fuera del namespace', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[]).push({
      surface: 'web',
      path: '/checkout',
      component: './HelloIsland',
      permissions: [],
    });
    expectRejected(m, 'fuera del namespace');
  });

  test('rechaza la raíz: un módulo nunca puede reclamar /', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[])[0] = {
      surface: 'web',
      path: '/',
      component: './HelloIsland',
      permissions: [],
    };
    expectRejected(m, 'routes');
  });

  test('rechaza permission keys sin el prefijo del namespace', () => {
    const m = baseManifest();
    (m.permissions as Record<string, unknown>[]).push({
      key: 'users.invite',
      label: 'Colarse',
    });
    expectRejected(m, 'no empieza con "hello."');
  });

  test('rechaza rutas que exigen permisos no declarados', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[])[1] = {
      surface: 'admin',
      path: '/hello',
      component: './HelloAdminPage',
      permissions: ['hello.secreto'],
    };
    expectRejected(m, 'no declara');
  });

  test('rechaza componentes de ruta que no están en exposes', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[])[0] = {
      surface: 'web',
      path: '/hello/:slug',
      component: './Otro',
      permissions: [],
    };
    expectRejected(m, 'no está en exposes');
  });

  test('rechaza slots de menú fuera de la lista blanca', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'toolbar-secreta',
      label: 'Hello',
      order: 1,
      path: '/hello',
    };
    expectRejected(m, 'menu');
  });

  test('rechaza entradas de menú fuera del namespace', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Hello',
      order: 1,
      path: '/usuarios',
    };
    expectRejected(m, 'fuera del namespace');
  });

  test('rechaza remoteEntry en un origen no permitido', () => {
    expectRejected(
      { ...baseManifest(), remoteEntry: 'https://evil.example.com/remoteEntry.js' },
      'lista blanca',
    );
  });

  test('rechaza campos desconocidos (strict), no los ignora', () => {
    expectRejected({ ...baseManifest(), superpoderes: true }, 'superpoderes');
  });

  test('rechaza un manifest sin contractVersion', () => {
    const m = baseManifest();
    delete m.contractVersion;
    expectRejected(m, 'contractVersion');
  });

  test('acepta un submenú con children y mode toggle', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Hello',
      order: 10,
      mode: 'toggle',
      children: [
        { label: 'Panel', path: '/hello', order: 1 },
        { label: 'Detalle', path: '/hello/detalle', order: 2 },
      ],
    };
    const result = validateManifest(m, ALLOWED);
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  test('rechaza una entrada de menú con path y children a la vez', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Hello',
      order: 10,
      path: '/hello',
      children: [{ label: 'Panel', path: '/hello' }],
    };
    expectRejected(m, 'path y children');
  });

  test('rechaza mode en una entrada hoja', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Hello',
      order: 10,
      path: '/hello',
      mode: 'toggle',
    };
    expectRejected(m, 'mode');
  });

  test('rechaza hijos de submenú fuera del namespace', () => {
    const m = baseManifest();
    (m.menu as Record<string, unknown>[])[0] = {
      surface: 'admin',
      slot: 'sidebar',
      label: 'Hello',
      order: 10,
      children: [{ label: 'Colado', path: '/usuarios' }],
    };
    expectRejected(m, 'fuera del namespace');
  });

  test('permite CONSUMIR permisos de otro namespace en rutas', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[])[1] = {
      surface: 'admin',
      path: '/hello',
      component: './HelloAdminPage',
      permissions: ['users.read'],
    };
    const result = validateManifest(m, ALLOWED);
    assert.equal(result.ok, true, JSON.stringify(result));
  });

  test('sigue exigiendo declarar los permisos del propio namespace', () => {
    const m = baseManifest();
    (m.routes as Record<string, unknown>[])[1] = {
      surface: 'admin',
      path: '/hello',
      component: './HelloAdminPage',
      permissions: ['hello.inexistente'],
    };
    expectRejected(m, 'no declara');
  });
});
