import { z } from 'zod';

// No estricto a propósito: process.env trae variables ajenas al core.
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MODULE_REGISTRY_CONFIG: z.string().default('./config/modules.json'),
  ALLOWED_REMOTE_ORIGINS: z.string().default(''),
  REGISTRY_REFRESH_MINUTES: z.coerce.number().int().min(1).default(5),
  PUBLIC_BASE_URL: z.url().default('https://likekiri.com'),
  ADMIN_BASE_URL: z.url().default('https://admin.likekiri.com'),
  WEB_DIST_DIR: z.string().default('./apps/web-shell/dist'),
  ADMIN_DIST_DIR: z.string().default('./apps/admin-shell/dist'),
  DATABASE_URL: z.string().default(''),
  INVITE_TTL_HOURS: z.coerce.number().int().min(1).default(72),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).default(168),
});

export interface CoreConfig {
  port: number;
  /** Ruta al JSON con los módulos registrados (relativa al cwd). */
  moduleRegistryConfigPath: string;
  allowedRemoteOrigins: string[];
  registryRefreshMinutes: number;
  publicBaseUrl: string;
  adminBaseUrl: string;
  /** Hosts que sirven la superficie web (apex y www). */
  webHosts: string[];
  /** Host que sirve la superficie admin. */
  adminHost: string;
  webDistDir: string;
  adminDistDir: string;
  databaseUrl: string;
  inviteTtlHours: number;
  sessionTtlHours: number;
}

/** Token de inyección para la config del core. */
export const CORE_CONFIG = Symbol('CORE_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CoreConfig {
  const parsed = EnvSchema.parse(env);
  const webHost = new URL(parsed.PUBLIC_BASE_URL).hostname.toLowerCase();
  const adminHost = new URL(parsed.ADMIN_BASE_URL).hostname.toLowerCase();
  return {
    port: parsed.PORT,
    moduleRegistryConfigPath: parsed.MODULE_REGISTRY_CONFIG,
    allowedRemoteOrigins: parsed.ALLOWED_REMOTE_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    registryRefreshMinutes: parsed.REGISTRY_REFRESH_MINUTES,
    publicBaseUrl: parsed.PUBLIC_BASE_URL,
    adminBaseUrl: parsed.ADMIN_BASE_URL,
    webHosts: webHost.startsWith('www.') ? [webHost] : [webHost, `www.${webHost}`],
    adminHost,
    webDistDir: parsed.WEB_DIST_DIR,
    adminDistDir: parsed.ADMIN_DIST_DIR,
    databaseUrl: parsed.DATABASE_URL,
    inviteTtlHours: parsed.INVITE_TTL_HOURS,
    sessionTtlHours: parsed.SESSION_TTL_HOURS,
  };
}
