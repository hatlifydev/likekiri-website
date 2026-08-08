import type { Surface } from '@likekiri/contract';

import type { CoreConfig } from '../config';

/**
 * Discriminación por Host: likekiri.com y www → web; admin.likekiri.com →
 * admin; cualquier otro host → null (404, sin fallback).
 */
export function surfaceForHost(hostname: string, config: CoreConfig): Surface | null {
  const host = hostname.toLowerCase();
  if (config.webHosts.includes(host)) return 'web';
  if (host === config.adminHost) return 'admin';
  return null;
}
