/**
 * Estructura del sitio que el back envía en cada render (server-driven UI).
 * El admin la edita (módulo "sitio"); el core la persiste y la inyecta en el
 * RenderRequest. Estos defaults son el paracaídas si llega ausente.
 */
export interface SiteLink {
  label: string;
  path: string;
}

export interface SiteConfig {
  anuncio: string | null;
  header: { links: SiteLink[] };
  footer: { links: SiteLink[] };
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  anuncio: null,
  header: {
    links: [
      { label: 'Personas', path: '/personas' },
      { label: 'Empresas', path: '/empresas' },
      { label: 'Equipo', path: '/equipo' },
      { label: 'Contacto', path: '/contacto' },
      { label: 'Iniciar sesión', path: '/clientes/acceso' },
    ],
  },
  footer: {
    links: [
      { label: 'Portal de clientes', path: '/clientes/acceso' },
      { label: 'Términos del servicio', path: '/terminos' },
      { label: 'Privacidad', path: '/privacidad' },
    ],
  },
};
