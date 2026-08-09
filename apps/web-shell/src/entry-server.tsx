import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

import { Document, type PageMeta } from './Document';
import { findPage, staticPages } from './pages/index';
import { NotFound, ServerError } from './pages/errors';
import { serializePropsForAttribute } from './serialize';
import type { SiteConfig } from './site-config';

/**
 * Contrato de render entre el core y este shell. El core hace SSR únicamente
 * del shell; los componentes remotos se emiten como placeholders de isla que
 * el cliente carga vía Module Federation e hidrata.
 */
export interface IslandDescriptor {
  moduleId: string;
  /** Nombre expuesto por el módulo, p. ej. "./HelloIsland". */
  component: string;
  remoteEntry: string;
  props: Record<string, unknown>;
}

export interface RenderRequest {
  path: string;
  baseUrl: string;
  island: IslandDescriptor | null;
  /** Estructura del sitio administrada desde el admin; opcional por resiliencia. */
  site?: SiteConfig;
}

export interface RenderHooks {
  onReady: (
    stream: { pipe: (destination: NodeJS.WritableStream) => void },
    status: number,
  ) => void;
  onError: (error: unknown) => void;
}

function IslandPlaceholder({ island }: { island: IslandDescriptor }): ReactElement {
  return (
    <div
      data-likekiri-island={`${island.moduleId}/${island.component}`}
      data-remote={island.remoteEntry}
      data-props={serializePropsForAttribute(island.props)}
    >
      <div className="isla-cargando">Cargando componente…</div>
    </div>
  );
}

function pickPage(request: RenderRequest): {
  element: ReactElement;
  status: number;
  withIslands: boolean;
} {
  if (request.island !== null) {
    const meta: PageMeta = {
      title: `LikeKiri — ${request.island.moduleId}`,
      description: 'Contenido servido por un módulo de la plataforma LikeKiri.',
      path: request.path,
      baseUrl: request.baseUrl,
    };
    return {
      status: 200,
      withIslands: true,
      element: (
        <Document meta={meta} site={request.site}>
          <section className="bloque">
            <div className="container">
              <IslandPlaceholder island={request.island} />
            </div>
          </section>
        </Document>
      ),
    };
  }

  const page = findPage(request.path);
  if (page !== null) {
    const meta: PageMeta = {
      title: page.title,
      description: page.description,
      path: page.path,
      baseUrl: request.baseUrl,
    };
    return {
      status: 200,
      withIslands: false,
      element: (
        <Document meta={meta} site={request.site}>
          <page.Component />
        </Document>
      ),
    };
  }

  const meta: PageMeta = {
    title: 'Página no encontrada — LikeKiri',
    description: 'La página solicitada no existe.',
    path: request.path,
    baseUrl: request.baseUrl,
  };
  return {
    status: 404,
    withIslands: false,
    element: (
      <Document meta={meta} site={request.site}>
        <NotFound />
      </Document>
    ),
  };
}

export function render(request: RenderRequest, hooks: RenderHooks): void {
  const { element, status, withIslands } = pickPage(request);
  const { pipe } = renderToPipeableStream(element, {
    // El runtime de islas solo se envía cuando la página tiene islas:
    // las páginas estáticas del shell viajan sin JavaScript.
    bootstrapModules: withIslands ? ['/assets/islands.js'] : [],
    onShellReady() {
      hooks.onReady({ pipe }, status);
    },
    onShellError(error) {
      hooks.onError(error);
    },
  });
}

/** HTML completo de la página 500, pre-renderizable por el core al arrancar. */
export function renderErrorPage(baseUrl: string, hooks: RenderHooks): void {
  const meta: PageMeta = {
    title: 'Error — LikeKiri',
    description: 'Error interno.',
    path: '/error',
    baseUrl,
  };
  const { pipe } = renderToPipeableStream(
    <Document meta={meta}>
      <ServerError />
    </Document>,
    {
      onShellReady() {
        hooks.onReady({ pipe }, 500);
      },
      onShellError(error) {
        hooks.onError(error);
      },
    },
  );
}

/** Rutas estáticas del shell, para el sitemap. */
export function staticPaths(): string[] {
  return staticPages.map((page) => page.path);
}
