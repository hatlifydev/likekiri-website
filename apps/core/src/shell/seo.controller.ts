import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { RegistryService } from '../registry/registry.service';
import { ShellService } from './shell.service';
import { surfaceForHost } from './host-resolver';

/** robots.txt y sitemap.xml, generados desde el shell + las rutas del registry. */
@Controller()
export class SeoController {
  constructor(
    @Inject(CORE_CONFIG) private readonly config: CoreConfig,
    @Inject(RegistryService) private readonly registry: RegistryService,
    @Inject(ShellService) private readonly shell: ShellService,
  ) {}

  @Get('robots.txt')
  robots(@Req() req: Request, @Res() res: Response): void {
    const surface = surfaceForHost(req.hostname, this.config);
    if (surface !== 'web') {
      // El admin no se indexa jamás.
      res
        .type('text/plain')
        .send(surface === 'admin' ? 'User-agent: *\nDisallow: /\n' : 'Not Found');
      if (surface === null) res.status(404);
      return;
    }
    res
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\n\nSitemap: ${this.config.publicBaseUrl}/sitemap.xml\n`);
  }

  @Get('sitemap.xml')
  async sitemap(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (surfaceForHost(req.hostname, this.config) !== 'web') {
      res.status(404).type('text/plain').send('Not Found');
      return;
    }
    const shellPaths = await this.shell.shellStaticPaths();
    const modulePaths = this.registry.staticWebPaths();
    const urls = [...new Set([...shellPaths, ...modulePaths])]
      .map((path) => new URL(path, this.config.publicBaseUrl).toString())
      .map((loc) => `  <url><loc>${loc}</loc></url>`)
      .join('\n');
    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      );
  }
}
