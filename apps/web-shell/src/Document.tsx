import type { ReactElement, ReactNode } from 'react';

import { shellCss } from './styles';
import { FigurasFooter, animationScript } from './decor';
import { DEFAULT_SITE_CONFIG, type SiteConfig } from './site-config';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  baseUrl: string;
}

function SiteHeader({ site }: { site: SiteConfig }): ReactElement {
  return (
    <header className="site">
      <div className="container">
        <a className="brand" href="/">
          <img
            src="/assets/marca/logo.webp"
            alt="LikeKiri — Software · Automation · Consulting"
            style={{ height: '78px', display: 'block' }}
          />
        </a>
        <nav className="main" aria-label="principal">
          {site.header.links.map((link) => (
            <a key={link.path} href={link.path}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ site }: { site: SiteConfig }): ReactElement {
  return (
    <footer className="site">
      <FigurasFooter />
      <div className="container">
        <div className="marca-pie">
          <img src="/assets/marca/logo.webp" alt="LikeKiri" />
          <div>© {new Date().getFullYear()} LikeKiri — Desarrollo y consultoría de software</div>
          <div>
            <a href="mailto:contacto@likekiri.com">contacto@likekiri.com</a>
          </div>
        </div>
        <nav aria-label="secundaria">
          {site.footer.links.map((link) => (
            <a key={link.path} href={link.path}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function Document({
  meta,
  site = DEFAULT_SITE_CONFIG,
  children,
}: {
  meta: PageMeta;
  site?: SiteConfig;
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
        <meta property="og:image" content={new URL('/assets/marca/logo.webp', meta.baseUrl).toString()} />
        <link rel="icon" type="image/png" href="/assets/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: shellCss }} />
      </head>
      <body>
        {site.anuncio !== null && <div className="anuncio">{site.anuncio}</div>}
        <SiteHeader site={site} />
        <main>{children}</main>
        <SiteFooter site={site} />
        <script dangerouslySetInnerHTML={{ __html: animationScript }} />
      </body>
    </html>
  );
}
