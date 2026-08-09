import { es, type Dictionary } from './es';
import { en } from './en';

export type { Dictionary } from './es';

/** Idiomas soportados. Español es el base. */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

const DICCIONARIOS: Record<Locale, Dictionary> = { es, en };

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en';
}

/** Normaliza cualquier entrada (cookie, header, cuenta) a un Locale válido. */
export function resolveLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  if (typeof value === 'string' && value.toLowerCase().startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

/** Devuelve el diccionario completo de un idioma. */
export function dict(locale: Locale): Dictionary {
  return DICCIONARIOS[locale];
}

/** Metadatos de idiomas para construir un selector. */
export const LOCALE_META: Array<{ code: Locale; name: string }> = [
  { code: 'es', name: es.localeName },
  { code: 'en', name: en.localeName },
];
