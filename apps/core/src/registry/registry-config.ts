import { z } from 'zod';

/**
 * Esquema del archivo MODULE_REGISTRY_CONFIG (config/modules.json).
 * Contiene claves HMAC: el archivo real está gitignored; se versiona solo
 * config/modules.example.json.
 */
export const ModuleRegistrationSchema = z.strictObject({
  moduleId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /** Base del módulo; el core hace GET {baseUrl}/.well-known/module-manifest */
  baseUrl: z.url(),
  /** Clave HMAC propia de ESTE módulo. Nunca compartida entre módulos. */
  hmacKey: z.string().min(32, 'la clave HMAC debe tener al menos 32 caracteres'),
});
export type ModuleRegistration = z.infer<typeof ModuleRegistrationSchema>;

export const RegistryFileSchema = z.strictObject({
  modules: z.array(ModuleRegistrationSchema).default([]),
});
export type RegistryFile = z.infer<typeof RegistryFileSchema>;

/**
 * Valida el archivo completo, incluidas las reglas que el esquema no ve:
 * moduleId repetido y clave HMAC compartida entre módulos (prohibida: con una
 * sola clave un módulo comprometido puede suplantar a los demás).
 */
export function parseRegistryFile(raw: string):
  | { ok: true; modules: ModuleRegistration[] }
  | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `JSON inválido: ${(err as Error).message}` };
  }
  const parsed = RegistryFileSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    return { ok: false, error: detail };
  }

  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const mod of parsed.data.modules) {
    if (ids.has(mod.moduleId)) {
      return { ok: false, error: `moduleId duplicado: ${mod.moduleId}` };
    }
    if (keys.has(mod.hmacKey)) {
      return {
        ok: false,
        error: `clave HMAC compartida detectada (módulo ${mod.moduleId}); cada módulo debe tener la suya`,
      };
    }
    ids.add(mod.moduleId);
    keys.add(mod.hmacKey);
  }
  return { ok: true, modules: parsed.data.modules };
}
