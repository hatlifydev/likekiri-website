import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

// Orden de registro: las rutas de API y assets se declaran SIEMPRE antes que el
// catch-all del shell (Fase 3), o el catch-all se las traga.
@Module({
  controllers: [HealthController],
})
export class AppModule {}
