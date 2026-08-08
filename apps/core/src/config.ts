import { z } from 'zod';

// No estricto a propósito: process.env trae variables ajenas al core.
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MODULE_REGISTRY_CONFIG: z.string().default('./config/modules.json'),
  ALLOWED_REMOTE_ORIGINS: z.string().default(''),
  REGISTRY_REFRESH_MINUTES: z.coerce.number().int().min(1).default(5),
});

export interface CoreConfig {
  port: number;
  /** Ruta al JSON con los módulos registrados (relativa al cwd). */
  moduleRegistryConfigPath: string;
  allowedRemoteOrigins: string[];
  registryRefreshMinutes: number;
}

/** Token de inyección para la config del core. */
export const CORE_CONFIG = Symbol('CORE_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CoreConfig {
  const parsed = EnvSchema.parse(env);
  return {
    port: parsed.PORT,
    moduleRegistryConfigPath: parsed.MODULE_REGISTRY_CONFIG,
    allowedRemoteOrigins: parsed.ALLOWED_REMOTE_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    registryRefreshMinutes: parsed.REGISTRY_REFRESH_MINUTES,
  };
}
