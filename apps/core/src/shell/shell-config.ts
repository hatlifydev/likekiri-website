import { z } from 'zod';

/**
 * Configuración server-driven del shell web: la edita el admin (vía el módulo
 * "sitio"), la persiste el core y la aplica el SSR. Es estructura del sitio,
 * no dominio de negocio: enlaces, anuncio, textos del marco.
 */

const LinkSchema = z.strictObject({
  label: z.string().min(1).max(40),
  path: z.string().min(1).max(200),
});

export const WebShellConfigSchema = z.strictObject({
  /** Franja de anuncio sobre el header; null = sin anuncio. */
  anuncio: z.string().min(1).max(200).nullable(),
  header: z.strictObject({ links: z.array(LinkSchema).max(8) }),
  footer: z.strictObject({ links: z.array(LinkSchema).max(8) }),
});
export type WebShellConfig = z.infer<typeof WebShellConfigSchema>;

export const DEFAULT_WEB_SHELL_CONFIG: WebShellConfig = {
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
