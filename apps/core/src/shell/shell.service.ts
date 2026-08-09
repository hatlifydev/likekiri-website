import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Response } from 'express';

import type { RouteMatch } from '../registry/registry.service';
import type { CoreConfig } from '../config';
import type { ShellConfigService } from './shell-config.service';
import type { WebShellConfig } from './shell-config';

interface RenderIsland {
  moduleId: string;
  component: string;
  remoteEntry: string;
  props: Record<string, unknown>;
  /** HTML pre-renderizado por el servidor del módulo (ssr: 'server'), o null. */
  html: string | null;
}

interface RenderWidget {
  moduleId: string;
  component: string;
  remoteEntry: string;
}

interface RenderRequest {
  path: string;
  baseUrl: string;
  island: RenderIsland | null;
  /** Estructura del sitio administrada desde el admin (server-driven UI). */
  site: WebShellConfig;
  /** Widgets globales (islas flotantes) de los módulos, en cada render. */
  widgets: RenderWidget[];
}

interface RenderStream {
  pipe: (destination: NodeJS.WritableStream) => void;
}

interface RenderHooks {
  onReady: (stream: RenderStream, status: number) => void;
  onError: (error: unknown) => void;
}

/** Contrato estructural con dist/server/entry-server.js del web-shell. */
interface EntryServerModule {
  render: (request: RenderRequest, hooks: RenderHooks) => void;
  staticPaths: () => string[];
}

/** Último recurso si el propio SSR está caído. */
const FALLBACK_500 = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Error — LikeKiri</title></head>
<body style="font-family:system-ui;padding:4rem;text-align:center">
<h1>500</h1><p>Algo falló de nuestro lado. Inténtalo de nuevo en unos minutos.</p>
</body></html>`;

@Injectable()
export class ShellService {
  private readonly logger = new Logger(ShellService.name);
  private entryPromise: Promise<EntryServerModule> | null = null;
  private adminHtmlCache: string | null = null;

  constructor(
    private readonly config: CoreConfig,
    private readonly shellConfig: ShellConfigService,
  ) {}

  private loadEntry(): Promise<EntryServerModule> {
    if (this.entryPromise === null) {
      const entryPath = resolve(
        process.cwd(),
        this.config.webDistDir,
        'server/entry-server.js',
      );
      // import() nativo: el bundle SSR es ESM y este paquete es CJS.
      this.entryPromise = import(pathToFileURL(entryPath).href).then(
        (mod) => mod as EntryServerModule,
      );
      this.entryPromise.catch(() => {
        // Permite reintentar en la siguiente petición si el dist aún no existe.
        this.entryPromise = null;
      });
    }
    return this.entryPromise;
  }

  /** index.html de la SPA de administración (shell estático, CSR). */
  async adminHtml(): Promise<string> {
    if (this.adminHtmlCache === null) {
      const htmlPath = resolve(process.cwd(), this.config.adminDistDir, 'index.html');
      this.adminHtmlCache = await readFile(htmlPath, 'utf8');
    }
    return this.adminHtmlCache;
  }

  /** SSR del shell web; si match es null, el shell decide (página estática o 404). */
  async streamWeb(
    match: RouteMatch | null,
    path: string,
    res: Response,
    islandHtml: string | null = null,
    widgets: RenderWidget[] = [],
  ): Promise<void> {
    let entry: EntryServerModule;
    try {
      entry = await this.loadEntry();
    } catch (error) {
      this.logger.error(`no se pudo cargar el entry-server del web-shell: ${String(error)}`);
      this.send500(res);
      return;
    }

    const request: RenderRequest = {
      path,
      baseUrl: this.config.publicBaseUrl,
      // El back decide la estructura del front en cada render.
      site: await this.shellConfig.getWebConfig(),
      widgets,
      island:
        match === null
          ? null
          : {
              moduleId: match.moduleId,
              component: match.route.component,
              remoteEntry: match.remoteEntry,
              props: match.params,
              html: islandHtml,
            },
    };

    entry.render(request, {
      onReady: (stream, status) => {
        res.status(status).type('text/html');
        stream.pipe(res);
      },
      onError: (error) => {
        this.logger.error(`error de SSR en ${path}: ${String(error)}`);
        this.send500(res);
      },
    });
  }

  /** Rutas estáticas del shell (para el sitemap). */
  async shellStaticPaths(): Promise<string[]> {
    try {
      const entry = await this.loadEntry();
      return entry.staticPaths();
    } catch {
      return ['/'];
    }
  }

  send500(res: Response): void {
    if (!res.headersSent) {
      res.status(500).type('text/html').send(FALLBACK_500);
    } else {
      res.end();
    }
  }

  /** Ruta absoluta de los assets cliente del web-shell. */
  webClientDir(): string {
    return join(resolve(process.cwd(), this.config.webDistDir), 'client');
  }
}
