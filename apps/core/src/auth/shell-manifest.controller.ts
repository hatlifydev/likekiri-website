import { BadRequestException, Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { SurfaceSchema } from '@likekiri/contract';

import { RegistryService, type ShellManifestDto } from '../registry/registry.service';
import { AuthService } from './auth.service';
import { readCookie, SESSION_COOKIE } from './tokens';

@Controller('api/shell')
export class ShellManifestController {
  // @Inject explícito: la DI por tipo necesita emitDecoratorMetadata, que el
  // runner de tests (tsx/esbuild) no emite. El token explícito funciona en ambos.
  constructor(
    @Inject(RegistryService) private readonly registry: RegistryService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get('manifest')
  async manifest(
    @Query('surface') surfaceRaw: string | undefined,
    @Req() req: Request,
  ): Promise<ShellManifestDto> {
    const surface = SurfaceSchema.safeParse(surfaceRaw);
    if (!surface.success) {
      throw new BadRequestException('surface debe ser "web" o "admin"');
    }
    // El filtrado por permisos ocurre AQUÍ, en el servidor. Sin sesión válida
    // el visitante es anónimo: solo ve rutas públicas (permissions: []).
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const auth = token === null ? null : await this.auth.sessionFromToken(token);
    const granted = auth?.permissions ?? new Set<string>();
    return this.registry.shellManifest(surface.data, granted);
  }
}
