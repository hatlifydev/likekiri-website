/**
 * Versión del contrato módulo↔core.
 *
 * Este paquete es el artefacto más importante del proyecto: es lo que consumen
 * los equipos que construyen módulos. Todo cambio incompatible del manifest
 * sube la major del paquete y este valor.
 */
export const CONTRACT_VERSION = '1';

/** Superficies de render que expone la plataforma. */
export type Surface = 'web' | 'admin';

// Fase 2: aquí viven los esquemas zod del manifest (ModuleManifestSchema),
// los tipos derivados y las reglas de validación de namespace.
