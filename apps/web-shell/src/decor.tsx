import type { ReactElement } from 'react';

/**
 * Figuras decorativas para las franjas oscuras: hojas y arcos que evocan el
 * logo, más puntos. Ocupan poco, van en posiciones estratégicas y mezclan
 * animación continua (CSS) con parallax por scroll/mouse (data-parallax, lo
 * mueve el script de animaciones). Marcadas aria-hidden.
 */

function Hoja({ className, style }: { className?: string; style?: React.CSSProperties }): ReactElement {
  return (
    <svg className={className} style={style} width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C7 4 4 8 4 13c0 4 3 8 8 9 0-6 1-10 6-14-4 0-7 1-9 4 1-4 2-7 3-10z" />
    </svg>
  );
}

function Flecha({ className, style }: { className?: string; style?: React.CSSProperties }): ReactElement {
  return (
    <svg className={className} style={style} width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19L19 5" />
      <path d="M9 5h10v10" />
    </svg>
  );
}

/**
 * Motivo de marca: la rama de Kiri (design-system §6, boceto «Rama»).
 * Un trazo continuo con dos bifurcaciones y hojas acorazonadas mínimas;
 * geométrico, sin modulación. pathLength=1 permite el trazado progresivo
 * en CSS puro (stroke-dashoffset), sin JavaScript.
 */
export function RamaKiri(): ReactElement {
  return (
    <svg className="rama-kiri" viewBox="0 0 220 160" fill="none" aria-hidden="true">
      <g className="trazo" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path pathLength={1} d="M14 152 C56 136 88 116 120 94 C142 79 160 71 180 66" />
        <path pathLength={1} d="M86 118 C98 98 106 84 110 60" />
        <path pathLength={1} d="M132 86 C148 93 160 104 166 120" />
        <path pathLength={1} d="M180 66 C180 66 173 61 174 56 A3.4 3.4 0 0 1 180 54 A3.4 3.4 0 0 1 186 56 C187 61 180 66 180 66 Z" transform="rotate(14 180 66)" />
        <path pathLength={1} d="M166 120 C166 120 159 115 160 110 A3.4 3.4 0 0 1 166 108 A3.4 3.4 0 0 1 172 110 C173 115 166 120 166 120 Z" transform="rotate(150 166 120)" />
      </g>
      <path
        className="hoja-acento"
        pathLength={1}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M110 60 C110 60 103 55 104 50 A3.4 3.4 0 0 1 110 48 A3.4 3.4 0 0 1 116 50 C117 55 110 60 110 60 Z"
        transform="rotate(-12 110 60)"
      />
    </svg>
  );
}

/** Set de figuras, más discreto, para el footer. */
export function FigurasFooter(): ReactElement {
  return (
    <div className="figuras" aria-hidden="true">
      <Hoja className="figura leaf anim-flotar" style={{ top: '20%', right: '10%', width: 34, height: 34, opacity: 0.3 }} data-parallax="0.18" />
      <span className="figura dot arc anim-pulso" style={{ bottom: '30%', left: '12%', width: 8, height: 8 }} />
      <Flecha className="figura arc anim-flotar2" style={{ bottom: '18%', right: '24%', opacity: 0.3 }} data-parallax="0.24" />
    </div>
  );
}

/**
 * Script de animaciones (progressive enhancement): se inyecta en el SSR y
 * corre en el navegador. Sin JS la página se ve completa e igual de usable.
 *  - reveal: aparición al entrar en viewport (IntersectionObserver).
 *  - parallax: figuras [data-parallax] responden al scroll y al mouse.
 * Respeta prefers-reduced-motion.
 */
export const animationScript = `
(function () {
  // Selector de idioma (siempre activo, aunque haya reduced-motion): fija la
  // cookie lk_lang y recarga para que el SSR renderice en el idioma elegido.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-set-lang]') : null;
    if (!b) return;
    document.cookie = 'lk_lang=' + b.getAttribute('data-set-lang') + '; path=/; max-age=31536000; samesite=lax';
    location.reload();
  });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add('visible'); }); }

  var figs = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var sy = 0, mx = 0, my = 0, ticking = false;
  function apply() {
    figs.forEach(function (f) {
      var k = parseFloat(f.getAttribute('data-parallax')) || 0.2;
      f.style.transform = 'translate3d(' + (mx * k * 22).toFixed(1) + 'px,' + ((my * k * 22) - (sy * k)).toFixed(1) + 'px,0)';
    });
    ticking = false;
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }
  window.addEventListener('scroll', function () { sy = window.scrollY * 0.08; req(); }, { passive: true });
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) - 0.5;
    my = (e.clientY / window.innerHeight) - 0.5;
    req();
  }, { passive: true });
})();
`;
