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
          <p className="eyebrow">{t.footer.derechos}</p>
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
          <ul className="hechos">
            <li>{h.heroHecho1}</li>
            <li>{h.heroHecho2}</li>
            <li>{h.heroHecho3}</li>
          </ul>
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
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>{h.s5Titulo}</h2>
          <p className="intro">{h.s5Intro}</p>
          <div className="fichas-adr">
            <article className="ficha-adr reveal">
              <span className="etiqueta-tec">{h.s5ResilTag}</span>
              <h3>{h.s5ResilT}</h3>
              <p>{h.s5ResilD}</p>
            </article>
            <article className="ficha-adr reveal">
              <span className="etiqueta-tec">{h.s5RendTag}</span>
              <h3>{h.s5RendT}</h3>
              <p>{h.s5RendD}</p>
            </article>
            <article className="ficha-adr reveal">
              <span className="etiqueta-tec">{h.s5PrivTag}</span>
              <h3>{h.s5PrivT}</h3>
              <p>{h.s5PrivD}</p>
            </article>
          </div>
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
