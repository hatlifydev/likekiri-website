import type { ReactElement } from 'react';

import { tokens } from '@likekiri/tokens';

// Fase 4: aquí vive la SPA real (login, usuarios, invitaciones, registry),
// que pide GET /api/shell/manifest?surface=admin y monta rutas de módulos.
export function App(): ReactElement {
  return (
    <main style={{ fontFamily: tokens.font.sans, padding: tokens.space.lg }}>
      <h1>likekiri admin</h1>
      <p>Panel de administración. Las pantallas llegan en la Fase 4.</p>
    </main>
  );
}
