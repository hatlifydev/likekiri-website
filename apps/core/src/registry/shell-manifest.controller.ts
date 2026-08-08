import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';

import { SurfaceSchema } from '@likekiri/contract';

import { RegistryService, type ShellManifestDto } from './registry.service';

@Controller('api/shell')
export class ShellManifestController {
  // @Inject explícito: la DI por tipo necesita emitDecoratorMetadata, que el
  // runner de tests (tsx/esbuild) no emite. El token explícito funciona en ambos.
  constructor(@Inject(RegistryService) private readonly registry: RegistryService) {}

  @Get('manifest')
  manifest(@Query('surface') surfaceRaw: string | undefined): ShellManifestDto {
    const surface = SurfaceSchema.safeParse(surfaceRaw);
    if (!surface.success) {
      throw new BadRequestException('surface debe ser "web" o "admin"');
    }
    // Fase 4: aquí entran los permisos de la sesión. Hoy, anónimo = sin
    // permisos: solo se ven rutas públicas (permissions: []).
    return this.registry.shellManifest(surface.data, new Set<string>());
  }
}
