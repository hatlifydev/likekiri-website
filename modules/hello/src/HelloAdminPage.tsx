import type { ReactElement } from 'react';

/**
 * Página de admin del módulo. La SPA la monta bajo /hello cuando el usuario
 * tiene el permiso hello.read.
 */
export function HelloAdminPage(): ReactElement {
  return (
    <section>
      <h1>Hello — administración</h1>
      <p>Página de ejemplo servida por el módulo hello.</p>
    </section>
  );
}
