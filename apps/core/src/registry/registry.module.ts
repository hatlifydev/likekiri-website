import { Module } from '@nestjs/common';

import { CORE_CONFIG, loadConfig, type CoreConfig } from '../config';
import { RegistryService } from './registry.service';

@Module({
  providers: [
    { provide: CORE_CONFIG, useFactory: () => loadConfig() },
    {
      provide: RegistryService,
      useFactory: (config: CoreConfig) => new RegistryService(config),
      inject: [CORE_CONFIG],
    },
  ],
  exports: [RegistryService, CORE_CONFIG],
})
export class RegistryModule {}
