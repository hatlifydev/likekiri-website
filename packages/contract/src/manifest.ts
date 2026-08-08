import { z } from 'zod';

/**
 * Versión del contrato módulo↔core. Todo cambio incompatible del manifest
 * sube la major de este paquete y este valor.
 */
export const CONTRACT_VERSION = '1';

/** Versiones de contrato que el core acepta en un manifest. */
export const SUPPORTED_CONTRACT_VERSIONS = ['1'] as const;

/**
 * Slots de menú que el core reconoce. Un manifest solo puede colgar entradas
 * de esta lista blanca; cualquier otro slot es rechazado por el esquema.
 */
export const MENU_SLOTS = ['sidebar', 'header', 'footer'] as const;
export type MenuSlot = (typeof MENU_SLOTS)[number];

export const SurfaceSchema = z.enum(['web', 'admin']);
export type Surface = z.infer<typeof SurfaceSchema>;

/** moduleId y namespace: minúsculas/dígitos/guiones, empiezan por letra. */
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Rutas: uno o más segmentos `/literal` o `/:param`. Sin raíz desnuda, sin
 * comodines, sin barra final.
 */
const PATH_PATTERN = /^(\/(?::[a-zA-Z][a-zA-Z0-9_]*|[a-z0-9][a-z0-9_-]*))+$/;

export const RouteSchema = z.strictObject({
  surface: SurfaceSchema,
  path: z.string().regex(PATH_PATTERN, 'ruta inválida (segmentos /literal o /:param)'),
  component: z.string().startsWith('./'),
  /** 'shell': el core hace SSR del layout y emite un placeholder de isla. */
  ssr: z.literal('shell').optional(),
  permissions: z.array(z.string().min(1)).default([]),
});
export type ModuleRoute = z.infer<typeof RouteSchema>;

export const MenuEntrySchema = z.strictObject({
  surface: SurfaceSchema,
  slot: z.enum(MENU_SLOTS),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  order: z.number().int().min(0),
  path: z.string().regex(PATH_PATTERN, 'ruta inválida'),
});
export type MenuEntry = z.infer<typeof MenuEntrySchema>;

export const PermissionDefSchema = z.strictObject({
  key: z.string().min(1),
  label: z.string().min(1),
});
export type PermissionDef = z.infer<typeof PermissionDefSchema>;

/**
 * Manifest que cada módulo publica en /.well-known/module-manifest.
 * strictObject: los campos desconocidos se rechazan, no se ignoran.
 */
export const ModuleManifestSchema = z.strictObject({
  contractVersion: z.enum(SUPPORTED_CONTRACT_VERSIONS),
  moduleId: z.string().regex(ID_PATTERN, 'moduleId inválido'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'versión no semver'),
  namespace: z.string().regex(ID_PATTERN, 'namespace inválido'),
  remoteEntry: z.url(),
  exposes: z.array(z.string().startsWith('./')).default([]),
  routes: z.array(RouteSchema).default([]),
  menu: z.array(MenuEntrySchema).default([]),
  permissions: z.array(PermissionDefSchema).default([]),
});
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;
