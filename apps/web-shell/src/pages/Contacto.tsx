import type { ReactElement } from 'react';

export function Contacto(): ReactElement {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Conversemos</h1>
          <p className="lead">
            Cuéntanos qué proceso te está quitando tiempo o qué información
            necesitas consultar sin que salga de tu organización. Respondemos
            dentro de un día hábil.
          </p>
          <div className="acciones">
            <a className="boton" href="mailto:contacto@likekiri.com">
              contacto@likekiri.com
            </a>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Qué esperar de la primera reunión</h2>
          <div className="prosa">
            <ul className="lista-check">
              <li>Una videollamada de una hora, sin costo y sin compromiso.</li>
              <li>
                Escuchamos tu caso y te decimos, ahí mismo, si es algo que
                sabemos resolver.
              </li>
              <li>
                Si avanzamos, el siguiente paso es siempre una propuesta escrita
                con alcance y precio cerrados.
              </li>
              <li>
                Si tu información es sensible, firmamos confidencialidad antes
                de que nos muestres nada.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
