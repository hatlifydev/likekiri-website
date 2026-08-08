import { ModuleManifestSchema, type ModuleManifest } from './manifest';

export interface ValidateManifestOptions {
  /** Orígenes (scheme://host[:puerto]) permitidos para remoteEntry. */
  allowedRemoteOrigins: readonly string[];
}

export type ManifestValidation =
  | { ok: true; manifest: ModuleManifest }
  | { ok: false; errors: string[] };

/** Un path vive dentro del namespace si es exactamente /ns o cuelga de /ns/. */
export function isWithinNamespace(path: string, namespace: string): boolean {
  return path === `/${namespace}` || path.startsWith(`/${namespace}/`);
}

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Valida un manifest completo: esquema zod estricto + reglas cross-field.
 * Acumula todos los errores en vez de cortar en el primero, para que el
 * registro de fallos del registry sea útil de una pasada.
 */
export function validateManifest(
  input: unknown,
  opts: ValidateManifestOptions,
): ManifestValidation {
  const parsed = ModuleManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
      ),
    };
  }

  const manifest = parsed.data;
  const errors: string[] = [];
  const exposed = new Set(manifest.exposes);
  const declaredPermissions = new Set(manifest.permissions.map((p) => p.key));

  for (const permission of manifest.permissions) {
    if (!permission.key.startsWith(`${manifest.namespace}.`)) {
      errors.push(
        `permissions: "${permission.key}" no empieza con "${manifest.namespace}."`,
      );
    }
  }

  for (const route of manifest.routes) {
    if (!isWithinNamespace(route.path, manifest.namespace)) {
      errors.push(
        `routes: "${route.path}" está fuera del namespace "/${manifest.namespace}"`,
      );
    }
    if (!exposed.has(route.component)) {
      errors.push(`routes: el componente "${route.component}" no está en exposes`);
    }
    for (const key of route.permissions) {
      if (!declaredPermissions.has(key)) {
        errors.push(
          `routes: "${route.path}" exige el permiso "${key}" que el manifest no declara`,
        );
      }
    }
  }

  for (const entry of manifest.menu) {
    if (!isWithinNamespace(entry.path, manifest.namespace)) {
      errors.push(
        `menu: "${entry.path}" está fuera del namespace "/${manifest.namespace}"`,
      );
    }
  }

  const allowed = new Set(
    opts.allowedRemoteOrigins
      .map(toOrigin)
      .filter((origin): origin is string => origin !== null),
  );
  const remoteOrigin = toOrigin(manifest.remoteEntry);
  if (remoteOrigin === null || !allowed.has(remoteOrigin)) {
    errors.push(
      `remoteEntry: el origen "${remoteOrigin ?? 'inválido'}" no está en la lista blanca`,
    );
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, manifest };
}
