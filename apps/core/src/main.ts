import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'node:path';

import { AppModule } from './app.module';
import { csrfOriginCheck } from './auth/csrf.middleware';
import { loadConfig } from './config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CSRF: la auth va en cookie, así que todo método mutante de /api exige un
  // Origin de nuestras superficies.
  app.use(csrfOriginCheck(config));

  // Assets estáticos como middleware: se resuelven antes que cualquier ruta,
  // así el catch-all del shell nunca los ve. Prefijos distintos por superficie
  // para que web y admin no colisionen en /assets.
  app.useStaticAssets(join(resolve(process.cwd(), config.webDistDir), 'client'), {
    prefix: '/assets/',
    immutable: true,
    maxAge: '1y',
    index: false,
  });
  app.useStaticAssets(resolve(process.cwd(), config.adminDistDir), {
    prefix: '/admin-assets/',
    immutable: true,
    maxAge: '1y',
    index: false,
  });

  // Solo loopback: Caddy es el único que expone el core al exterior (ADR 001).
  await app.listen(config.port, '127.0.0.1');
  console.log(`core escuchando en http://127.0.0.1:${config.port}`);
}

void bootstrap();
