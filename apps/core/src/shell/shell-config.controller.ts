import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import {
  PermissionsGuard,
  RequirePermissions,
  SessionGuard,
  type AuthedRequest,
} from '../auth/guards';
import { ShellConfigService } from './shell-config.service';
import { DEFAULT_WEB_SHELL_CONFIG, type WebShellConfig } from './shell-config';

/**
 * API con la que el admin gestiona la estructura del sitio público.
 * La consume el módulo "sitio"; el permiso shell.manage es de plataforma.
 */
@Controller('api/admin/shell-config')
@UseGuards(SessionGuard, PermissionsGuard)
export class ShellConfigController {
  constructor(
    @Inject(ShellConfigService) private readonly config: ShellConfigService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  @RequirePermissions('shell.manage')
  async get(): Promise<{ config: WebShellConfig; defaults: WebShellConfig }> {
    return { config: await this.config.getWebConfig(), defaults: DEFAULT_WEB_SHELL_CONFIG };
  }

  @Put()
  @RequirePermissions('shell.manage')
  async put(@Body() body: unknown, @Req() req: AuthedRequest): Promise<{ config: WebShellConfig }> {
    const saved = await this.config.setWebConfig(body);
    await this.auth.audit(req.auth?.userId ?? null, 'shell-config.updated', 'web-shell', {}, null);
    return { config: saved };
  }
}
