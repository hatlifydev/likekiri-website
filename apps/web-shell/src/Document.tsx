import type { ReactElement, ReactNode } from 'react';

import { dict, type Dictionary, type Locale } from '@likekiri/i18n';

import { shellCss } from './styles';
import { FigurasFooter, animationScript } from './decor';
import { DEFAULT_SITE_CONFIG, type SiteConfig } from './site-config';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  baseUrl: string;
}

/** Selector de idioma: fija la cookie lk_lang y recarga (ver animationScript). */
function SelectorIdioma({ locale }: { locale: Locale }): ReactElement {
  return (
    <span className="idiomas" aria-label="Idioma">
      <button type="button" data-set-lang="es" className={locale === 'es' ? 'activo' : ''}>
        ES
      </button>
      <button type="button" data-set-lang="en" className={locale === 'en' ? 'activo' : ''}>
        EN
      </button>
    </span>
  );
}

function SiteHeader({ site, t, locale }: { site: SiteConfig; t: Dictionary; locale: Locale }): ReactElement {
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
              {traducirNav(link.label, t)}
            </a>
          ))}
          <SelectorIdioma locale={locale} />
        </nav>
      </div>
    </header>
  );
}

/**
 * Traduce las etiquetas por defecto del menú a partir del diccionario. Si un
 * enlace fue personalizado desde el admin (texto que no coincide con los
 * valores por defecto), se respeta tal cual.
 */
function traducirNav(label: string, t: Dictionary): string {
  const mapa: Record<string, string> = {
    Personas: t.nav.personas,
    Empresas: t.nav.empresas,
    Equipo: t.nav.equipo,
    Contacto: t.nav.contacto,
    'Iniciar sesión': t.nav.iniciarSesion,
    'Portal de clientes': t.footer.portalClientes,
    'Términos del servicio': t.footer.terminos,
    Privacidad: t.footer.privacidad,
  };
  return mapa[label] ?? label;
}

function SiteFooter({ site, t }: { site: SiteConfig; t: Dictionary }): ReactElement {
  return (
    <footer className="site">
      <FigurasFooter />
      <div className="container">
        <div className="marca-pie">
          <img src="/assets/marca/logo.webp" alt="LikeKiri" />
          <div>© {new Date().getFullYear()} LikeKiri — {t.footer.derechos}</div>
          <div>
            <a href="mailto:contacto@likekiri.com">contacto@likekiri.com</a>
          </div>
        </div>
        <nav aria-label="legal">
          {site.footer.links.map((link) => (
            <a key={link.path} href={link.path}>
              {traducirNav(link.label, t)}
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
  locale = 'es',
  children,
}: {
  meta: PageMeta;
  site?: SiteConfig;
  locale?: Locale;
  children: ReactNode;
}): ReactElement {
  const t = dict(locale);
  const canonical = new URL(meta.path, meta.baseUrl).toString();
  return (
    <html lang={locale}>
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
        <meta property="og:locale" content={locale === 'en' ? 'en_US' : 'es_CL'} />
        <meta property="og:image" content={new URL('/assets/marca/logo.webp', meta.baseUrl).toString()} />
        <link rel="icon" type="image/png" href="/assets/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
        <link rel="preload" href="/assets/fonts/inter-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/inter-semibold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: shellCss }} />
      </head>
      <body>
        {site.anuncio !== null && <div className="anuncio">{site.anuncio}</div>}
        <SiteHeader site={site} t={t} locale={locale} />
        <main>{children}</main>
        <SiteFooter site={site} t={t} />
        <script dangerouslySetInnerHTML={{ __html: animationScript }} />
      </body>
    </html>
  );
}
