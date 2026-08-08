import type { ReactElement } from 'react';
import { useState } from 'react';

export interface HelloIslandProps {
  slug: string;
}

/**
 * Isla pública: el core la sirve como placeholder SSR y el cliente la hidrata.
 * El contador demuestra que la hidratación funciona (estado interactivo).
 */
export function HelloIsland({ slug }: HelloIslandProps): ReactElement {
  const [count, setCount] = useState(0);
  return (
    <section>
      <h2>Hola desde el módulo hello</h2>
      <p>
        slug: <strong>{slug}</strong>
      </p>
      <button type="button" onClick={() => setCount((n) => n + 1)}>
        Hidratada: {count} clics
      </button>
    </section>
  );
}
