import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

import { Document, type PageMeta } from './Document';
import { findPage, staticPages } from './pages/index';
import { NotFound, ServerError } from './pages/errors';
import { serializePropsForAttribute } from './serialize';
import type { SiteConfig } from './site-config';
import type { TeamMember } from './pages/index';

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
  /**
   * HTML pre-renderizado por el SERVIDOR DEL MÓDULO (ssr: 'server'), o null.
   * Con HTML el cliente hidrata; sin él, monta sobre el placeholder.
   */
  html?: string | null;
}

export interface WidgetDescriptor {
  moduleId: string;
  component: string;
  remoteEntry: string;
}

export interface RenderRequest {
  path: string;
  baseUrl: string;
  island: IslandDescriptor | null;
  /** Estructura del sitio administrada desde el admin; opcional por resiliencia. */
  site?: SiteConfig;
  /** Widgets globales (islas flotantes) inyectados por el core en cada render. */
  widgets?: WidgetDescriptor[];
  /** Equipo (fichas) para la página pública, desde el admin. */
  team?: TeamMember[];
}

/** Islas flotantes globales (chat, etc.): se montan en toda página. */
function Widgets({ widgets }: { widgets: WidgetDescriptor[] }): ReactElement {
  return (
    <>
      {widgets.map((w) => (
        <div
          key={w.moduleId + w.component}
          data-likekiri-island={`${w.moduleId}/${w.component}`}
          data-remote={w.remoteEntry}
          data-props="{}"
        >
          <link rel="modulepreload" href="/assets/islands.js" />
          <link rel="modulepreload" href={w.remoteEntry} />
        </div>
      ))}
    </>
  );
}

export interface RenderHooks {
  onReady: (
    stream: { pipe: (destination: NodeJS.WritableStream) => void },
    status: number,
  ) => void;
  onError: (error: unknown) => void;
}

function IslandPlaceholder({ island }: { island: IslandDescriptor }): ReactElement {
  const attrs = {
    'data-likekiri-island': `${island.moduleId}/${island.component}`,
    'data-remote': island.remoteEntry,
    'data-props': serializePropsForAttribute(island.props),
  };
  const conHtml = island.html != null && island.html !== '';
  return (
    <>
      {/* React 19 los iza al <head>: el navegador precarga el runtime y el
          remoto en paralelo con el HTML, sin esperar la cascada de scripts. */}
      <link rel="modulepreload" href="/assets/islands.js" />
      <link rel="modulepreload" href={island.remoteEntry} />
      {conHtml ? (
        // SSR delegado: el HTML lo produjo el servidor del módulo; el cliente
        // hidrata este subárbol (data-hydrate) en lugar de montarlo de cero.
        <div
          {...attrs}
          data-hydrate="1"
          dangerouslySetInnerHTML={{ __html: island.html as string }}
        />
      ) : (
        <div {...attrs}>
          <div className="isla-cargando">Cargando componente…</div>
        </div>
      )}
    </>
  );
}

function pickPage(request: RenderRequest): {
  element: ReactElement;
  status: number;
  withIslands: boolean;
} {
  const widgets = request.widgets ?? [];
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
          <Widgets widgets={widgets} />
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
      withIslands: widgets.length > 0,
      element: (
        <Document meta={meta} site={request.site}>
          <page.Component team={request.team ?? []} />
          <Widgets widgets={widgets} />
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
    withIslands: widgets.length > 0,
    element: (
      <Document meta={meta} site={request.site}>
        <NotFound />
        <Widgets widgets={widgets} />
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
