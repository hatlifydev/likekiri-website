import 'reflect-metadata';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { get, type IncomingMessage } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { INestApplication } from '@nestjs/common';

const FAKE_ENTRY = `
export function render(request, hooks) {
  const status = request.island ? 200 : request.path === '/' ? 200 : 404;
  const island = request.island
    ? '<div data-likekiri-island="' + request.island.moduleId + '/' + request.island.component + '"></div>'
    : '';
  const body = '<!doctype html><html><head><title>fake</title></head><body>pagina:' +
    request.path + island + '</body></html>';
  hooks.onReady({ pipe(destination) { destination.end(body); } }, status);
}
export function staticPaths() { return ['/']; }
`;

interface SimpleResponse {
  status: number;
  body: string;
}

function request(port: number, path: string, host: string): Promise<SimpleResponse> {
  return new Promise((resolveReq, rejectReq) => {
    const req = get(
      { host: '127.0.0.1', port, path, headers: { Host: host } },
      (res: IncomingMessage) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => resolveReq({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', rejectReq);
  });
}

describe('catch-all del shell por Host', () => {
  let app: INestApplication;
  let port = 0;

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'likekiri-shell-'));
    mkdirSync(join(dir, 'web/server'), { recursive: true });
    mkdirSync(join(dir, 'web/client'), { recursive: true });
    mkdirSync(join(dir, 'admin'), { recursive: true });
    // El dist real vive bajo un package.json con type:module; el falso también.
    writeFileSync(join(dir, 'web/package.json'), '{"type":"module"}');
    writeFileSync(join(dir, 'web/server/entry-server.js'), FAKE_ENTRY);
    writeFileSync(
      join(dir, 'admin/index.html'),
      '<!doctype html><html><body>spa-admin</body></html>',
    );

    process.env.WEB_DIST_DIR = join(dir, 'web');
    process.env.ADMIN_DIST_DIR = join(dir, 'admin');
    process.env.PUBLIC_BASE_URL = 'https://likekiri.com';
    process.env.ADMIN_BASE_URL = 'https://admin.likekiri.com';
    process.env.MODULE_REGISTRY_CONFIG = join(dir, 'no-existe.json');

    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    port = Number(new URL(url).port);
  });

  after(async () => {
    await app.close();
  });

  test('host web sirve la home con SSR', async () => {
    const res = await request(port, '/', 'likekiri.com');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('pagina:/'));
  });

  test('www también es superficie web', async () => {
    const res = await request(port, '/', 'www.likekiri.com');
    assert.equal(res.status, 200);
  });

  test('una ruta web desconocida devuelve 404 renderizado', async () => {
    const res = await request(port, '/no-existe', 'likekiri.com');
    assert.equal(res.status, 404);
  });

  test('host admin sirve la SPA', async () => {
    const res = await request(port, '/usuarios', 'admin.likekiri.com');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('spa-admin'));
  });

  test('host desconocido devuelve 404 sin fallback', async () => {
    const res = await request(port, '/', 'evil.example.com');
    assert.equal(res.status, 404);
    assert.ok(res.body.includes('Not Found'));
  });

  test('las rutas de API se registran antes que el catch-all', async () => {
    const res = await request(port, '/api/health', 'likekiri.com');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('"status":"ok"'));
    const manifest = await request(port, '/api/shell/manifest?surface=web', 'likekiri.com');
    assert.equal(manifest.status, 200);
    assert.ok(manifest.body.includes('"contractVersion"'));
  });

  test('robots.txt del web enlaza el sitemap; el admin se desindexa', async () => {
    const robots = await request(port, '/robots.txt', 'likekiri.com');
    assert.equal(robots.status, 200);
    assert.ok(robots.body.includes('Sitemap: https://likekiri.com/sitemap.xml'));
    const adminRobots = await request(port, '/robots.txt', 'admin.likekiri.com');
    assert.ok(adminRobots.body.includes('Disallow: /'));
  });

  test('sitemap.xml lista las rutas estáticas del shell', async () => {
    const res = await request(port, '/sitemap.xml', 'likekiri.com');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('<loc>https://likekiri.com/</loc>'));
  });
});
