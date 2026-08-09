import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  CONTRACT_VERSION,
  validateManifest,
  type MenuEntry,
  type ModuleManifest,
  type ModuleRoute,
  type Surface,
} from '@likekiri/contract';
import {
  buildSignedHeaders,
  verifySignature,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
} from '@likekiri/contract/hmac';

import { type CoreConfig } from '../config';
import { parseRegistryFile, type ModuleRegistration } from './registry-config';

export interface RouteMatch {
  moduleId: string;
  remoteEntry: string;
  route: ModuleRoute;
  params: Record<string, string>;
}

export interface ShellRouteDto {
  moduleId: string;
  path: string;
  component: string;
  remoteEntry: string;
  ssr: 'shell' | 'server' | null;
}

export interface ShellMenuChildDto {
  label: string;
  path: string;
  icon: string | null;
  order: number;
}

export interface ShellMenuDto {
  moduleId: string;
  slot: MenuEntry['slot'];
  label: string;
  icon: string | null;
  order: number;
  /** Hoja: enlace directo. null cuando la entrada es un submenú. */
  path: string | null;
  /** Presentación del submenú; null en entradas hoja. */
  mode: 'expanded' | 'toggle' | null;
  /** Hijos visibles del submenú (vacío en entradas hoja). */
  children: ShellMenuChildDto[];
}

export interface ShellManifestDto {
  contractVersion: string;
  surface: Surface;
  routes: ShellRouteDto[];
  menu: ShellMenuDto[];
}

export interface ModuleStatusDto {
  moduleId: string;
  name: string | null;
  version: string | null;
  syncedAt: string | null;
  ok: boolean;
  errors: string[];
}

interface CompiledRoute {
  moduleId: string;
  remoteEntry: string;
  /** Clave de colisión: superficie + segmentos con params normalizados a ':'. */
  normalized: string;
  segments: string[];
  route: ModuleRoute;
}

interface SyncedModule {
  registration: ModuleRegistration;
  manifest: ModuleManifest;
  syncedAt: Date;
}

interface SyncFailure {
  moduleId: string;
  at: Date;
  errors: string[];
}

const FETCH_TIMEOUT_MS = 5000;
/** Presupuesto del SSR delegado: si el módulo no responde, se degrada a shell. */
const RENDER_TIMEOUT_MS = 400;

@Injectable()
export class RegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegistryService.name);
  private modules = new Map<string, SyncedModule>();
  private failures = new Map<string, SyncFailure>();
  private tables: Record<Surface, CompiledRoute[]> = { web: [], admin: [] };
  private timer: NodeJS.Timeout | null = null;

  // Se provee vía useFactory en RegistryModule (sin decoradores de parámetro,
  // así el servicio se instancia a mano en tests).
  constructor(private readonly config: CoreConfig) {}

  async onModuleInit(): Promise<void> {
    await this.syncAll();
    const intervalMs = this.config.registryRefreshMinutes * 60_000;
    this.timer = setInterval(() => {
      void this.syncAll().catch((err: unknown) => {
        this.logger.error(`fallo inesperado en el refresco del registry: ${String(err)}`);
      });
    }, intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async syncAll(): Promise<void> {
    const registrations = await this.loadRegistrations();
    const synced: SyncedModule[] = [];
    const failures = new Map<string, SyncFailure>();

    for (const registration of registrations) {
      const result = await this.syncModule(registration);
      if (result.ok) {
        synced.push(result.module);
        continue;
      }
      failures.set(registration.moduleId, {
        moduleId: registration.moduleId,
        at: new Date(),
        errors: result.errors,
      });
      this.logger.error(
        `módulo "${registration.moduleId}" rechazado: ${result.errors.join(' | ')}`,
      );
      // Disponibilidad: si hubo una versión buena anterior, se mantiene.
      const previous = this.modules.get(registration.moduleId);
      if (previous) {
        this.logger.warn(
          `se mantiene la última versión buena de "${registration.moduleId}" (v${previous.manifest.version})`,
        );
        synced.push(previous);
      }
    }

    const { tables, accepted, rejected } = this.compile(synced);
    for (const failure of rejected) {
      failures.set(failure.moduleId, failure);
      this.logger.error(
        `módulo "${failure.moduleId}" rechazado por colisión: ${failure.errors.join(' | ')}`,
      );
    }

    this.modules = accepted;
    this.failures = failures;
    this.tables = tables;
    this.logger.log(
      `registry sincronizado: ${accepted.size} módulos, ` +
        `${tables.web.length} rutas web, ${tables.admin.length} rutas admin, ` +
        `${failures.size} con errores`,
    );
  }

  /** Resuelve un path de una superficie contra las rutas registradas. */
  match(surface: Surface, path: string): RouteMatch | null {
    const clean = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
    const parts = clean.split('/').filter((s) => s.length > 0);
    for (const compiled of this.tables[surface]) {
      if (compiled.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let matches = true;
      for (let i = 0; i < compiled.segments.length; i += 1) {
        const pattern = compiled.segments[i] as string;
        const value = parts[i] as string;
        if (pattern.startsWith(':')) {
          params[pattern.slice(1)] = decodeURIComponent(value);
        } else if (pattern !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return {
          moduleId: compiled.moduleId,
          remoteEntry: compiled.remoteEntry,
          route: compiled.route,
          params,
        };
      }
    }
    return null;
  }

  /**
   * Rutas y menú de una superficie, filtrados por los permisos otorgados.
   * El filtrado ocurre aquí, en el servidor: el cliente nunca decide.
   */
  shellManifest(surface: Surface, granted: ReadonlySet<string>): ShellManifestDto {
    const visible = this.tables[surface].filter((compiled) =>
      compiled.route.permissions.every((permission) => granted.has(permission)),
    );

    const routes: ShellRouteDto[] = visible.map((compiled) => ({
      moduleId: compiled.moduleId,
      path: compiled.route.path,
      component: compiled.route.component,
      remoteEntry: compiled.remoteEntry,
      ssr: compiled.route.ssr ?? null,
    }));

    const visibleByModule = new Map<string, CompiledRoute[]>();
    for (const compiled of visible) {
      const list = visibleByModule.get(compiled.moduleId) ?? [];
      list.push(compiled);
      visibleByModule.set(compiled.moduleId, list);
    }

    const menu: ShellMenuDto[] = [];
    for (const synced of this.modules.values()) {
      const visibleRoutes = visibleByModule.get(synced.manifest.moduleId) ?? [];
      const pointsToVisible = (path: string): boolean =>
        visibleRoutes.some((compiled) => this.pathMatchesPattern(path, compiled));

      for (const entry of synced.manifest.menu) {
        if (entry.surface !== surface) continue;

        if (entry.children !== undefined) {
          // Submenú: cada hijo solo es visible si apunta a una ruta visible;
          // el grupo entero desaparece si no le queda ningún hijo.
          const children: ShellMenuChildDto[] = entry.children
            .filter((child) => pointsToVisible(child.path))
            .map((child) => ({
              label: child.label,
              path: child.path,
              icon: child.icon ?? null,
              order: child.order,
            }))
            .sort((a, b) => a.order - b.order);
          if (children.length === 0) continue;
          menu.push({
            moduleId: synced.manifest.moduleId,
            slot: entry.slot,
            label: entry.label,
            icon: entry.icon ?? null,
            order: entry.order,
            path: null,
            mode: entry.mode ?? 'expanded',
            children,
          });
          continue;
        }

        // Entrada hoja: visible solo si apunta a una ruta visible.
        if (entry.path === undefined || !pointsToVisible(entry.path)) continue;
        menu.push({
          moduleId: synced.manifest.moduleId,
          slot: entry.slot,
          label: entry.label,
          icon: entry.icon ?? null,
          order: entry.order,
          path: entry.path,
          mode: null,
          children: [],
        });
      }
    }
    menu.sort((a, b) => a.order - b.order);

    return { contractVersion: CONTRACT_VERSION, surface, routes, menu };
  }

  /**
   * SSR delegado: pide al SERVIDOR DEL MÓDULO el HTML de un componente
   * (POST /render firmado con la clave del módulo). El código del módulo
   * jamás se ejecuta aquí. Cualquier fallo o timeout devuelve null y la
   * página degrada al placeholder de isla.
   */
  async renderRemote(
    moduleId: string,
    component: string,
    props: Record<string, unknown>,
  ): Promise<string | null> {
    const synced = this.modules.get(moduleId);
    if (synced === undefined) return null;
    try {
      const body = JSON.stringify({ component, props });
      const headers = buildSignedHeaders(
        synced.registration.hmacKey,
        moduleId,
        body,
      );
      const response = await fetch(
        new URL('/render', synced.registration.baseUrl),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body,
          signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { html?: unknown };
      return typeof data.html === 'string' && data.html.length > 0 ? data.html : null;
    } catch (error) {
      this.logger.warn(
        `SSR delegado de "${moduleId}" falló (${String(error)}); se degrada a shell`,
      );
      return null;
    }
  }

  /** Estado del registry para la vista de administración. */
  status(): ModuleStatusDto[] {
    const out: ModuleStatusDto[] = [];
    const ids = new Set([...this.modules.keys(), ...this.failures.keys()]);
    for (const moduleId of ids) {
      const synced = this.modules.get(moduleId);
      const failure = this.failures.get(moduleId);
      out.push({
        moduleId,
        name: synced?.manifest.name ?? null,
        version: synced?.manifest.version ?? null,
        syncedAt: synced?.syncedAt.toISOString() ?? null,
        ok: failure === undefined,
        errors: failure?.errors ?? [],
      });
    }
    return out.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }

  /** Rutas web sin parámetros, para el sitemap. */
  staticWebPaths(): string[] {
    return this.tables.web
      .filter((compiled) => compiled.segments.every((s) => !s.startsWith(':')))
      .map((compiled) => compiled.route.path);
  }

  private pathMatchesPattern(path: string, compiled: CompiledRoute): boolean {
    const parts = path.split('/').filter((s) => s.length > 0);
    if (parts.length !== compiled.segments.length) return false;
    return compiled.segments.every(
      (pattern, i) => pattern.startsWith(':') || pattern === parts[i],
    );
  }

  private async loadRegistrations(): Promise<ModuleRegistration[]> {
    const path = resolve(process.cwd(), this.config.moduleRegistryConfigPath);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        this.logger.warn(`sin config de módulos en ${path}: registry vacío`);
        return [];
      }
      this.logger.error(`no se pudo leer ${path}: ${String(err)}`);
      return [];
    }
    const parsed = parseRegistryFile(raw);
    if (!parsed.ok) {
      this.logger.error(`config de módulos inválida (${path}): ${parsed.error}`);
      return [];
    }
    return parsed.modules;
  }

  private async syncModule(
    registration: ModuleRegistration,
  ): Promise<{ ok: true; module: SyncedModule } | { ok: false; errors: string[] }> {
    let body: string;
    let timestamp: string;
    let signature: string;
    try {
      const url = new URL('/.well-known/module-manifest', registration.baseUrl).toString();
      const headers = buildSignedHeaders(registration.hmacKey, registration.moduleId, '');
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return { ok: false, errors: [`GET ${url} devolvió HTTP ${response.status}`] };
      }
      body = await response.text();
      timestamp = response.headers.get(HEADER_TIMESTAMP) ?? '';
      signature = response.headers.get(HEADER_SIGNATURE) ?? '';
    } catch (err) {
      return { ok: false, errors: [`fallo de red en el pull: ${String(err)}`] };
    }

    const verdict = verifySignature({
      key: registration.hmacKey,
      moduleId: registration.moduleId,
      body,
      timestamp,
      signature,
    });
    if (!verdict.ok) {
      return { ok: false, errors: [`firma HMAC de la respuesta inválida (${verdict.reason})`] };
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false, errors: ['el manifest no es JSON válido'] };
    }

    const validation = validateManifest(json, {
      allowedRemoteOrigins: this.config.allowedRemoteOrigins,
    });
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }
    if (validation.manifest.moduleId !== registration.moduleId) {
      return {
        ok: false,
        errors: [
          `el manifest dice moduleId "${validation.manifest.moduleId}" pero la config lo registra como "${registration.moduleId}"`,
        ],
      };
    }

    return {
      ok: true,
      module: { registration, manifest: validation.manifest, syncedAt: new Date() },
    };
  }

  private compile(synced: SyncedModule[]): {
    tables: Record<Surface, CompiledRoute[]>;
    accepted: Map<string, SyncedModule>;
    rejected: SyncFailure[];
  } {
    const tables: Record<Surface, CompiledRoute[]> = { web: [], admin: [] };
    const accepted = new Map<string, SyncedModule>();
    const rejected: SyncFailure[] = [];
    const owners = new Map<string, string>();

    for (const mod of synced) {
      const moduleId = mod.manifest.moduleId;
      const candidates: CompiledRoute[] = [];
      let conflict: string | null = null;

      for (const route of mod.manifest.routes) {
        const segments = route.path.split('/').filter((s) => s.length > 0);
        const normalized =
          `${route.surface} /` +
          segments.map((s) => (s.startsWith(':') ? ':' : s)).join('/');
        const owner = owners.get(normalized);
        if (owner !== undefined) {
          conflict = `la ruta "${route.path}" (${route.surface}) ya pertenece al módulo "${owner}" — el primero en registrarse gana`;
          break;
        }
        candidates.push({
          moduleId,
          remoteEntry: mod.manifest.remoteEntry,
          normalized,
          segments,
          route,
        });
      }

      if (conflict !== null) {
        rejected.push({ moduleId, at: new Date(), errors: [conflict] });
        continue;
      }
      for (const candidate of candidates) {
        owners.set(candidate.normalized, moduleId);
        tables[candidate.route.surface].push(candidate);
      }
      accepted.set(moduleId, mod);
    }

    return { tables, accepted, rejected };
  }
}
