import type { ReactElement } from 'react';

import { FigurasHero, RamaKiri } from '../decor';
import type { PageContext } from './index';

export function Home({ t }: PageContext): ReactElement {
  const h = t.home;
  return (
    <>
      <section className="hero franja-oscura">
        <FigurasHero />
        <RamaKiri />
        <div className="container">
          <h1>{h.heroTitulo}</h1>
          <p className="lead">{h.heroLead}</p>
          <div className="acciones">
            <a className="boton" href="/contacto">
              {h.ctaConversemos}
            </a>
            <a className="boton secundario" href="/empresas">
              {h.ctaEmpresas}
            </a>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>{h.s1Titulo}</h2>
          <p className="intro">{h.s1Intro}</p>
          <div className="servicios">
            <article className="servicio reveal">
              <span className="etiqueta-tec">{h.s1BatchTag}</span>
              <h3>{h.s1BatchT}</h3>
              <p>{h.s1BatchD}</p>
            </article>
            <article className="servicio reveal">
              <span className="etiqueta-tec">{h.s1RpaTag}</span>
              <h3>{h.s1RpaT}</h3>
              <p>{h.s1RpaD}</p>
            </article>
            <article className="servicio reveal">
              <span className="etiqueta-tec">{h.s1IaTag}</span>
              <h3>{h.s1IaT}</h3>
              <p>{h.s1IaD}</p>
            </article>
            <article className="servicio destacado reveal">
              <span className="etiqueta-tec">{h.s1RagTag}</span>
              <h3>{h.s1RagT}</h3>
              <p>{h.s1RagD}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>{h.s2Titulo}</h2>
          <p className="intro">{h.s2Intro}</p>
          <div className="tarjetas">
            <div className="tarjeta reveal"><h3>{h.s2DatosT}</h3><p>{h.s2DatosD}</p></div>
            <div className="tarjeta reveal"><h3>{h.s2ConsumoT}</h3><p>{h.s2ConsumoD}</p></div>
            <div className="tarjeta reveal"><h3>{h.s2PropiosT}</h3><p>{h.s2PropiosD}</p></div>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>{h.s3Titulo}</h2>
          <p className="intro">{h.s3Intro}</p>
          <div className="tarjetas">
            <div className="tarjeta reveal"><h3>{h.s3ReguladaT}</h3><p>{h.s3ReguladaD}</p></div>
            <div className="tarjeta reveal"><h3>{h.s3DisenoT}</h3><p>{h.s3DisenoD}</p></div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>{h.s4Titulo}</h2>
          <ol className="pipeline">
            <li className="paso reveal">
              <span className="nodo" aria-hidden="true">1</span>
              <h3>{h.s4DiagT}</h3>
              <p>{h.s4DiagD}</p>
            </li>
            <li className="paso reveal">
              <span className="nodo" aria-hidden="true">2</span>
              <h3>{h.s4PilotoT}</h3>
              <p>{h.s4PilotoD}</p>
            </li>
            <li className="paso reveal">
              <span className="nodo" aria-hidden="true">3</span>
              <h3>{h.s4DespliegueT}</h3>
              <p>{h.s4DespliegueD}</p>
            </li>
            <li className="paso reveal">
              <span className="nodo" aria-hidden="true">4</span>
              <h3>{h.s4AcompT}</h3>
              <p>{h.s4AcompD}</p>
            </li>
          </ol>
          <div className="acciones al-final">
            <a className="boton" href="/contacto">
              {h.ctaAgenda}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
