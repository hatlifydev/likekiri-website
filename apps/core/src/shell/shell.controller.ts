import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { RegistryService } from '../registry/registry.service';
import { ShellService } from './shell.service';
import { surfaceForHost } from './host-resolver';

/**
 * Catch-all del shell. NestJS construye su router en el bootstrap, así que la
 * resolución dinámica de rutas de módulos pasa por aquí: una ruta, muchos
 * destinos. Las rutas de API y los assets se registran ANTES que este
 * controlador (ver AppModule), o el catch-all se las traga.
 */
@Controller()
export class ShellController {
  constructor(
    @Inject(CORE_CONFIG) private readonly config: CoreConfig,
    @Inject(RegistryService) private readonly registry: RegistryService,
    @Inject(ShellService) private readonly shell: ShellService,
  ) {}

  @Get('{*path}')
  async resolve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const surface = surfaceForHost(req.hostname, this.config);

    // Host desconocido → 404 seco, sin fallback. El ruido de bots que llega
    // por IP o con Host inventado muere aquí, barato.
    if (surface === null) {
      res.status(404).type('text/plain').send('Not Found');
      return;
    }

    if (surface === 'admin') {
      try {
        res.type('text/html').send(await this.shell.adminHtml());
      } catch (error) {
        this.shell.send500(res);
      }
      return;
    }

    const match = this.registry.match('web', req.path);
    // SSR delegado: el HTML lo produce el servidor del módulo, no este proceso.
    const islandHtml =
      match !== null && match.route.ssr === 'server'
        ? await this.registry.renderRemote(match.moduleId, match.route.component, match.params)
        : null;
    await this.shell.streamWeb(match, req.path, res, islandHtml);
  }
}
