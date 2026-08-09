import { Module } from '@nestjs/common';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { AuthModule } from '../auth/auth.module';
import { PRISMA } from '../auth/auth.module-tokens';
import { SessionGuard, PermissionsGuard } from '../auth/guards';
import type { PrismaService } from '../prisma.service';
import { RegistryModule } from '../registry/registry.module';
import { ShellService } from './shell.service';
import { ShellConfigService } from './shell-config.service';
import { ShellConfigController } from './shell-config.controller';
import { SeoController } from './seo.controller';
import { ShellController } from './shell.controller';

@Module({
  imports: [RegistryModule, AuthModule],
  providers: [
    {
      provide: ShellConfigService,
      useFactory: (prisma: PrismaService) => new ShellConfigService(prisma),
      inject: [PRISMA],
    },
    {
      provide: ShellService,
      useFactory: (config: CoreConfig, shellConfig: ShellConfigService) =>
        new ShellService(config, shellConfig),
      inject: [CORE_CONFIG, ShellConfigService],
    },
    SessionGuard,
    PermissionsGuard,
  ],
  // Orden: API de config y SEO primero; el catch-all SIEMPRE al final.
  controllers: [ShellConfigController, SeoController, ShellController],
  exports: [ShellService, ShellConfigService],
})
export class ShellModule {}
