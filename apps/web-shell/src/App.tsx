import type { ReactElement } from 'react';

import { tokens } from '@likekiri/tokens';

export function App(): ReactElement {
  return (
    <main style={{ fontFamily: tokens.font.sans, padding: tokens.space.lg }}>
      <h1>likekiri</h1>
      <p>Shell del website público. El layout real llega en la Fase 5.</p>
    </main>
  );
}
