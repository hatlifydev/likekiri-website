import 'reflect-metadata';
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildSignedHeaders } from '@likekiri/contract/hmac';

import { RegistryService } from '../src/registry/registry.service';
import type { CoreConfig } from '../src/config';

const KEY_HELLO = 'clave-hmac-del-modulo-hello-0123456789abcdef';
const KEY_OTRO = 'clave-hmac-del-modulo-otro-0123456789abcdef!';

interface TestModuleServer {
  port: number;
  origin: string;
  close: () => Promise<void>;
}

const servers: Server[] = [];
after(async () => {
  await Promise.all(
    servers.map(
      (server) => new Promise<void>((resolveClose) => server.close(() => resolveClose())),
    ),
  );
});

/** Servidor de módulo mínimo: sirve el manifest firmado con la clave dada. */
function startModuleServer(
  moduleId: string,
  signingKey: string,
  manifest: () => Record<string, unknown>,
): Promise<TestModuleServer> {
  return new Promise((resolveStart) => {
    const server = createServer((req, res) => {
      if (req.url?.startsWith('/.well-known/module-manifest')) {
        const body = JSON.stringify(manifest());
        const headers = buildSignedHeaders(signingKey, moduleId, body);
        res.writeHead(200, { 'content-type': 'application/json', ...headers });
        res.end(body);
        return;
      }
      res.writeHead(404).end();
    });
    servers.push(server);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('sin puerto asignado');
      }
      resolveStart({
        port: address.port,
        origin: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((resolveClose) => server.close(() => resolveClose())),
      });
    });
  });
}

function helloManifest(origin: string): Record<string, unknown> {
  return {
    contractVersion: '1',
    moduleId: 'hello',
    name: 'Hello',
    version: '0.1.0',
    namespace: 'hello',
    remoteEntry: `${origin}/remoteEntry.js`,
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
      { surface: 'admin', slot: 'sidebar', label: 'Hello', order: 30, path: '/hello' },
    ],
    permissions: [
      { key: 'hello.read', label: 'Ver Hello' },
      { key: 'hello.write', label: 'Editar Hello' },
    ],
  };
}

function writeRegistryConfig(
  modules: Array<{ moduleId: string; baseUrl: string; hmacKey: string }>,
): string {
  const dir = mkdtempSync(join(tmpdir(), 'likekiri-registry-'));
  const file = join(dir, 'modules.json');
  writeFileSync(file, JSON.stringify({ modules }));
  return file;
}

function makeConfig(configPath: string, origins: string[]): CoreConfig {
  return {
    port: 0,
    moduleRegistryConfigPath: configPath,
    allowedRemoteOrigins: origins,
    registryRefreshMinutes: 5,
  };
}

describe('RegistryService', () => {
  test('sincroniza un módulo firmado, resuelve rutas y filtra por permisos', async () => {
    let origin = '';
    const server = await startModuleServer('hello', KEY_HELLO, () => helloManifest(origin));
    origin = server.origin;

    const configPath = writeRegistryConfig([
      { moduleId: 'hello', baseUrl: server.origin, hmacKey: KEY_HELLO },
    ]);
    const registry = new RegistryService(makeConfig(configPath, [server.origin]));
    await registry.syncAll();

    // match con parámetro
    const match = registry.match('web', '/hello/demo');
    assert.ok(match, 'la ruta /hello/demo debería resolver');
    assert.equal(match.moduleId, 'hello');
    assert.deepEqual(match.params, { slug: 'demo' });
    assert.equal(registry.match('web', '/no-existe'), null);

    // filtrado por permisos: anónimo no ve la ruta admin protegida
    const anon = registry.shellManifest('admin', new Set());
    assert.equal(anon.routes.length, 0);
    assert.equal(anon.menu.length, 0);

    // con hello.read sí aparece ruta y menú
    const conPermiso = registry.shellManifest('admin', new Set(['hello.read']));
    assert.equal(conPermiso.routes.length, 1);
    assert.equal(conPermiso.routes[0]?.path, '/hello');
    assert.equal(conPermiso.menu.length, 1);
    assert.equal(conPermiso.menu[0]?.label, 'Hello');

    // la superficie web es pública
    const web = registry.shellManifest('web', new Set());
    assert.equal(web.routes.length, 1);
    assert.equal(web.routes[0]?.ssr, 'shell');
  });

  test('rechaza un manifest con firma HMAC inválida', async () => {
    let origin = '';
    const server = await startModuleServer('hello', KEY_OTRO, () => helloManifest(origin));
    origin = server.origin;

    const configPath = writeRegistryConfig([
      { moduleId: 'hello', baseUrl: server.origin, hmacKey: KEY_HELLO },
    ]);
    const registry = new RegistryService(makeConfig(configPath, [server.origin]));
    await registry.syncAll();

    assert.equal(registry.match('web', '/hello/demo'), null);
    const status = registry.status();
    assert.equal(status.length, 1);
    assert.equal(status[0]?.ok, false);
    assert.ok(status[0]?.errors.some((e) => e.includes('firma')));
  });

  test('rechaza un manifest que reclama rutas fuera de su namespace', async () => {
    let origin = '';
    const server = await startModuleServer('hello', KEY_HELLO, () => {
      const manifest = helloManifest(origin);
      (manifest.routes as Record<string, unknown>[]).push({
        surface: 'web',
        path: '/checkout',
        component: './HelloIsland',
        permissions: [],
      });
      return manifest;
    });
    origin = server.origin;

    const configPath = writeRegistryConfig([
      { moduleId: 'hello', baseUrl: server.origin, hmacKey: KEY_HELLO },
    ]);
    const registry = new RegistryService(makeConfig(configPath, [server.origin]));
    await registry.syncAll();

    assert.equal(registry.match('web', '/hello/demo'), null);
    const status = registry.status();
    assert.ok(status[0]?.errors.some((e) => e.includes('fuera del namespace')));
  });

  test('en una colisión de rutas gana el primero y el segundo falla ruidosamente', async () => {
    let originA = '';
    const serverA = await startModuleServer('hello', KEY_HELLO, () => helloManifest(originA));
    originA = serverA.origin;

    let originB = '';
    const serverB = await startModuleServer('hello-clon', KEY_OTRO, () => {
      const manifest = helloManifest(originB);
      manifest.moduleId = 'hello-clon';
      // mismo namespace y misma forma de ruta => colisión de /hello/:slug
      manifest.menu = [];
      (manifest.routes as Record<string, unknown>[]).splice(1, 1);
      return manifest;
    });
    originB = serverB.origin;

    const configPath = writeRegistryConfig([
      { moduleId: 'hello', baseUrl: serverA.origin, hmacKey: KEY_HELLO },
      { moduleId: 'hello-clon', baseUrl: serverB.origin, hmacKey: KEY_OTRO },
    ]);
    const registry = new RegistryService(
      makeConfig(configPath, [serverA.origin, serverB.origin]),
    );
    await registry.syncAll();

    const match = registry.match('web', '/hello/algo');
    assert.equal(match?.moduleId, 'hello');
    const clon = registry.status().find((s) => s.moduleId === 'hello-clon');
    assert.equal(clon?.ok, false);
    assert.ok(clon?.errors.some((e) => e.includes('colisión') || e.includes('pertenece')));
  });

  test('sin archivo de config, el registry queda vacío y el core arranca sano', async () => {
    const registry = new RegistryService(
      makeConfig('/ruta/que/no/existe/modules.json', []),
    );
    await registry.syncAll();
    assert.equal(registry.match('web', '/hello/demo'), null);
    assert.deepEqual(registry.status(), []);
  });

  test('una clave HMAC compartida entre módulos invalida la config completa', async () => {
    let origin = '';
    const server = await startModuleServer('hello', KEY_HELLO, () => helloManifest(origin));
    origin = server.origin;

    const configPath = writeRegistryConfig([
      { moduleId: 'hello', baseUrl: server.origin, hmacKey: KEY_HELLO },
      { moduleId: 'otro', baseUrl: server.origin, hmacKey: KEY_HELLO },
    ]);
    const registry = new RegistryService(makeConfig(configPath, [server.origin]));
    await registry.syncAll();
    assert.equal(registry.match('web', '/hello/demo'), null);
  });
});
