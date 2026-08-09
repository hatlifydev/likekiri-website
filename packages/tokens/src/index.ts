/**
 * Design tokens compartidos. Los shells y los módulos consumen estos valores
 * (o las variables CSS generadas con cssVariables) para mantener coherencia
 * visual sin acoplarse entre sí.
 */
export const tokens = {
  // Paleta oficial LikeKiri (dark mode palette del manual de marca):
  // fondo #12181F · container #243323 · accent/button #2E8B57 ·
  // support #D99B3B · tipografía #F4F5F7
  color: {
    background: '#12181f',
    surface: '#243323',
    text: '#f4f5f7',
    textMuted: '#a9b4bf',
    brand: '#2e8b57',
    brandContrast: '#f4f5f7',
    accent: '#d99b3b',
    danger: '#f87171',
    border: '#2e3a45',
  },
  font: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
  },
  space: {
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
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Aplana los tokens a variables CSS: `--lk-color-brand`, `--lk-space-md`, …
 * Devuelve el bloque de declaraciones listo para inyectar en `:root`.
 */
export function cssVariables(prefix = 'lk'): string {
  const lines: string[] = [];
  for (const [group, values] of Object.entries(tokens)) {
    for (const [key, value] of Object.entries(values)) {
      lines.push(`--${prefix}-${group}-${key}: ${value};`);
    }
  }
  return lines.join('\n');
}
