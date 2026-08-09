/**
 * Contrato módulo↔core de likekiri. Este paquete es lo que consumen los
 * equipos que construyen módulos: esquemas del manifest, tipos y validación.
 *
 * Los helpers HMAC viven en el subpath '@likekiri/contract/hmac' (usan
 * node:crypto y no deben llegar a bundles de navegador).
 */
export {
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_VERSIONS,
  MENU_SLOTS,
  SurfaceSchema,
  RouteSchema,
  MenuChildSchema,
  MenuEntrySchema,
  PermissionDefSchema,
  ModuleManifestSchema,
} from './manifest';
export type {
  MenuSlot,
  Surface,
  ModuleRoute,
  MenuChild,
  MenuEntry,
  PermissionDef,
  ModuleManifest,
} from './manifest';
export { validateManifest, isWithinNamespace } from './validate';
export type { ValidateManifestOptions, ManifestValidation } from './validate';
