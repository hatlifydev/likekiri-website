import type { ReactElement } from 'react';

export function NotFound(): ReactElement {
  return (
    <div className="pagina-error container">
      <h1>404</h1>
      <p>La página que buscas no existe o cambió de dirección.</p>
      <p>
        <a href="/">Volver al inicio</a>
      </p>
    </div>
  );
}

export function ServerError(): ReactElement {
  return (
    <div className="pagina-error container">
      <h1>500</h1>
      <p>Algo falló de nuestro lado. Ya quedó registrado; inténtalo de nuevo en unos minutos.</p>
      <p>
        <a href="/">Volver al inicio</a>
      </p>
    </div>
  );
}
