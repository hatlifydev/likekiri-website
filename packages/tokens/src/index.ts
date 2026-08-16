/**
 * Design tokens compartidos. Los shells y los módulos consumen estos valores
 * (o las variables CSS generadas con cssVariables) para mantener coherencia
 * visual sin acoplarse entre sí.
 *
 * Sistema definido en docs/design/design-system.md. Tema claro como base;
 * las franjas oscuras (hero/header/footer del sitio, sidebar del admin) usan
 * el grupo `color.dark`. Compatibilidad: las claves históricas se conservan
 * siempre (los consumidores dependen de los nombres `--lk-*`), solo se añade.
 *
 * NOTA Fase 1 (plomería): las claves re-apuntadas (`background`, `surface`,
 * `text`, `textMuted`, `border`, `danger`) llevan el valor claro que los
 * shells ya usaban vía override, para no alterar ningún runtime. Los valores
 * definitivos de la paleta cálida del doc (§2.1) se adoptan junto con el
 * rediseño visual (Fases 2–4).
 */
export const tokens = {
  color: {
    // Neutros del tema claro (base actual de ambos shells)
    background: '#ffffff',
    surface: '#f4f6f8',
    surfaceSunken: '#f2f0ea',
    text: '#1d2630',
    textSecondary: '#45514b',
    textMuted: '#5b6674',
    border: '#e2e7ec',
    borderStrong: '#828b84',
    // Verde de marca: identidad vs. acción (ver §2.2 del doc — el verde puro
    // no alcanza AA como fondo de texto normal; los botones migran a `action`)
    brand: '#2e8b57',
    brandContrast: '#f4f5f7',
    brandText: '#1f6b45',
    brandTint: '#e7f2eb',
    action: '#28794c',
    actionHover: '#226741',
    actionActive: '#1e5e3b',
    // Dorado/oliva: acento de confianza, nunca color de acción
    accent: '#d99b3b',
    accentText: '#8a5b13',
    accentTint: '#f8eed9',
    // Estados
    success: '#1a7f4d',
    successTint: '#e3f2e9',
    danger: '#b91c1c',
    dangerTint: '#fbe9e9',
    warning: '#92610c',
    warningTint: '#faf0dc',
    // Franja oscura (tema invertido explícito)
    dark: {
      base: '#12181f',
      container: '#243323',
      text: '#f4f5f7',
      textSecondary: '#c6cfd8',
      textMuted: '#b9c3cd',
      border: '#33414d',
      brand: '#3fa76c',
    },
  },
  font: {
    sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    display: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
  },
  // Escala modular razón 1.25 sobre 16px (§3.2). Titulares en `font.display`
  // (Source Serif 4): peso 600 y tracking 0 — sin tracking negativo, que
  // estrangula a las serifs. Se adopta en el CSS a partir de la Fase 2.
  type: {
    display: {
      size: 'clamp(2.441rem, 1.9rem + 2.6vw, 3.4rem)',
      lineHeight: '1.1',
      weight: '600',
      tracking: '0',
    },
    h1: {
      size: 'clamp(1.953rem, 1.7rem + 1.2vw, 2.441rem)',
      lineHeight: '1.15',
      weight: '600',
      tracking: '0',
    },
    h2: { size: '1.563rem', lineHeight: '1.3', weight: '600', tracking: '0' },
    h3: { size: '1.25rem', lineHeight: '1.35', weight: '600', tracking: '0' },
    lead: { size: '1.125rem', lineHeight: '1.55', weight: '400', tracking: '0' },
    body: { size: '1rem', lineHeight: '1.6', weight: '400', tracking: '0' },
    small: { size: '0.875rem', lineHeight: '1.5', weight: '400', tracking: '0' },
    caption: { size: '0.8rem', lineHeight: '1.4', weight: '500', tracking: '0' },
  },
  // Base 4px. Los alias históricos xs–xl se conservan apuntando al mismo paso.
  space: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
    xl: '4rem',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
    hero: '40px',
    pill: '999px',
  },
  // Elevación sobria: tinta fría derivada de color.dark.base, nunca negro puro.
  shadow: {
    1: '0 1px 2px rgba(18, 24, 31, 0.06), 0 2px 8px rgba(18, 24, 31, 0.04)',
    2: '0 4px 12px rgba(18, 24, 31, 0.08), 0 12px 24px rgba(18, 24, 31, 0.06)',
    3: '0 16px 40px rgba(18, 24, 31, 0.14)',
  },
  motion: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    ease: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  layout: {
    container: '1080px',
    gutter: '1.25rem',
  },
} as const;

export type Tokens = typeof tokens;

/** Grupo de tokens: hojas string o subgrupos anidados (p. ej. color.dark). */
interface TokenGroup {
  readonly [key: string]: string | TokenGroup;
}

/**
 * Aplana los tokens a variables CSS: `--lk-color-brand`, `--lk-space-md`, …
 * Los grupos anidados se aplanan recursivamente (`--lk-color-dark-base`,
 * `--lk-type-h1-size`). Devuelve el bloque de declaraciones listo para
 * inyectar en `:root`. Las variables de un nivel que ya se emitían antes de
 * la recursión conservan exactamente el mismo nombre.
 */
export function cssVariables(prefix = 'lk'): string {
  const lines: string[] = [];
  const walk = (value: string | TokenGroup, path: string): void => {
    if (typeof value === 'string') {
      lines.push(`${path}: ${value};`);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      walk(child, `${path}-${key}`);
    }
  };
  walk(tokens, `--${prefix}`);
  return lines.join('\n');
}
