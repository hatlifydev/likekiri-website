import { init, loadRemote, registerRemotes } from '@module-federation/runtime';
import type { ComponentType } from 'react';

import type { ShellRoute } from './api';

let initialized = false;
const known = new Set<string>();

/** Carga el componente remoto de una ruta de módulo vía Module Federation. */
export async function loadRemoteComponent(
  route: ShellRoute,
): Promise<ComponentType<Record<string, unknown>>> {
  const remote = { name: route.moduleId, entry: route.remoteEntry };
  if (!initialized) {
    init({ name: 'likekiri_admin', remotes: [remote] });
    initialized = true;
    known.add(route.moduleId);
  } else if (!known.has(route.moduleId)) {
    registerRemotes([remote]);
    known.add(route.moduleId);
  }
  const exposed = route.component.replace(/^\.\//, '');
  const remoteModule = await loadRemote<Record<string, unknown>>(
    `${route.moduleId}/${exposed}`,
  );
  const candidate = remoteModule?.[exposed] ?? remoteModule?.['default'];
  if (typeof candidate !== 'function') {
    throw new Error(`el módulo ${route.moduleId} no expone un componente "${exposed}"`);
  }
  return candidate as ComponentType<Record<string, unknown>>;
}

/** Matching de rutas con :params, mismo criterio que el core. */
export function matchModuleRoute(
  routes: ShellRoute[],
  pathname: string,
): { route: ShellRoute; params: Record<string, string> } | null {
  const parts = pathname.split('/').filter((s) => s.length > 0);
  for (const route of routes) {
    const segments = route.path.split('/').filter((s) => s.length > 0);
    if (segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < segments.length; i += 1) {
      const pattern = segments[i] as string;
      const value = parts[i] as string;
      if (pattern.startsWith(':')) params[pattern.slice(1)] = decodeURIComponent(value);
      else if (pattern !== value) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}
