import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  // Solo loopback: Caddy es el único que expone el core al exterior (ADR 001).
  await app.listen(port, '127.0.0.1');
  console.log(`core escuchando en http://127.0.0.1:${port}`);
}

void bootstrap();
