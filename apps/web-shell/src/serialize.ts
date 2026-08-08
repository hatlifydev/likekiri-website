/**
 * Serializa props de una isla para incrustarlas en un atributo HTML.
 * Nunca JSON.stringify crudo dentro de HTML: secuencias como </script> o
 * U+2028/U+2029 rompen el documento y abren un vector de inyección. Además
 * React escapa el atributo, pero este escape es independiente del transporte.
 */
export function serializePropsForAttribute(props: Record<string, unknown>): string {
  return JSON.stringify(props)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
