import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import type { PrismaService } from '../prisma.service';
import {
  DEFAULT_WEB_SHELL_CONFIG,
  WebShellConfigSchema,
  type WebShellConfig,
} from './shell-config';

const SETTING_KEY = 'web-shell';
const CACHE_TTL_MS = 30_000;

@Injectable()
export class ShellConfigService {
  private readonly logger = new Logger(ShellConfigService.name);
  private cache: { value: WebShellConfig; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Config vigente del shell web. Nunca lanza: si la base no responde o el
   * JSON guardado no valida, el SSR sigue con los valores por defecto.
   */
  async getWebConfig(): Promise<WebShellConfig> {
    if (this.cache !== null && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }
    try {
      const row = await this.prisma.shellSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      const parsed =
        row === null ? null : WebShellConfigSchema.safeParse(row.value);
      if (parsed !== null && !parsed.success) {
        this.logger.error(
          `config del shell inválida en la base; se usan los valores por defecto`,
        );
      }
      const value = parsed?.success === true ? parsed.data : DEFAULT_WEB_SHELL_CONFIG;
      this.cache = { value, at: Date.now() };
      return value;
    } catch (error) {
      this.logger.warn(`no se pudo leer la config del shell: ${String(error)}`);
      return DEFAULT_WEB_SHELL_CONFIG;
    }
  }

  async setWebConfig(input: unknown): Promise<WebShellConfig> {
    const parsed = WebShellConfigSchema.safeParse(input);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
        .join(' | ');
      throw new BadRequestException(`configuración inválida: ${detail}`);
    }
    await this.prisma.shellSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: parsed.data },
      update: { value: parsed.data },
    });
    this.cache = { value: parsed.data, at: Date.now() };
    return parsed.data;
  }
}
