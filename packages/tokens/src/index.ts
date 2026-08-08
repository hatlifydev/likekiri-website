/**
 * Design tokens compartidos. Los shells y los módulos consumen estos valores
 * (o las variables CSS generadas con cssVariables) para mantener coherencia
 * visual sin acoplarse entre sí.
 */
export const tokens = {
  color: {
    background: '#ffffff',
    surface: '#f6f7f9',
    text: '#1a1d21',
    textMuted: '#5c6570',
    brand: '#0f766e',
    brandContrast: '#ffffff',
    accent: '#d97706',
    danger: '#b91c1c',
    border: '#d9dee3',
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
