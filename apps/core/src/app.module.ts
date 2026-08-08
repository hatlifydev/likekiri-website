import { Module } from '@nestjs/common';

import { HealthModule } from './health.module';
import { RegistryModule } from './registry/registry.module';
import { ShellModule } from './shell/shell.module';

// El orden de imports define el orden de registro de rutas: API y salud
// primero, el catch-all del shell SIEMPRE al final o se traga /api/*.
@Module({
  imports: [HealthModule, RegistryModule, ShellModule],
})
export class AppModule {}
