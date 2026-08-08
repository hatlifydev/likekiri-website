import type { ReactElement, ReactNode } from 'react';

import { shellCss } from './styles';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  baseUrl: string;
}

function SiteHeader(): ReactElement {
  return (
    <header className="site">
      <div className="container">
        <a className="brand" href="/">
          Like<span>Kiri</span>
        </a>
        <nav className="main" aria-label="principal">
          <a href="/personas">Personas</a>
          <a href="/empresas">Empresas</a>
          <a href="/equipo">Equipo</a>
          <a href="/contacto">Contacto</a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter(): ReactElement {
  return (
    <footer className="site">
      <div className="container">
        <div>
          <div>© {new Date().getFullYear()} LikeKiri — Desarrollo y consultoría de software</div>
          <div>
            <a href="mailto:contacto@likekiri.com">contacto@likekiri.com</a>
          </div>
        </div>
        <nav aria-label="legal">
          <a href="/terminos">Términos del servicio</a>
          <a href="/privacidad">Privacidad</a>
        </nav>
      </div>
    </footer>
  );
}

export function Document({
  meta,
  children,
}: {
  meta: PageMeta;
  children: ReactNode;
}): ReactElement {
  const canonical = new URL(meta.path, meta.baseUrl).toString();
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LikeKiri" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content="es_CL" />
        <style dangerouslySetInnerHTML={{ __html: shellCss }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
