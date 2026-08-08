import { Module } from '@nestjs/common';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { RegistryModule } from '../registry/registry.module';
import { ShellService } from './shell.service';
import { SeoController } from './seo.controller';
import { ShellController } from './shell.controller';

@Module({
  imports: [RegistryModule],
  providers: [
    {
      provide: ShellService,
      useFactory: (config: CoreConfig) => new ShellService(config),
      inject: [CORE_CONFIG],
    },
  ],
  // Orden: SEO primero; el catch-all SIEMPRE al final.
  controllers: [SeoController, ShellController],
  exports: [ShellService],
})
export class ShellModule {}
