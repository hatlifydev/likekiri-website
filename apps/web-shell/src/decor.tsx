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

/** Set de figuras para el hero. */
export function FigurasHero(): ReactElement {
  return (
    <div className="figuras" aria-hidden="true">
      <Hoja className="figura leaf anim-flotar" style={{ top: '18%', right: '8%', width: 46, height: 46 }} data-parallax="0.15" />
      <Flecha className="figura arc anim-flotar2" style={{ top: '55%', right: '18%' }} data-parallax="0.28" />
      <Hoja className="figura leaf anim-flotar2" style={{ bottom: '14%', left: '6%', width: 30, height: 30, opacity: 0.35 }} data-parallax="0.2" />
      <span className="figura dot arc anim-pulso" style={{ top: '28%', left: '14%', width: 10, height: 10 }} />
      <span className="figura dot leaf anim-pulso" style={{ bottom: '26%', right: '30%', width: 7, height: 7 }} data-parallax="0.4" />
      <span className="figura dot arc anim-pulso" style={{ top: '12%', left: '42%', width: 6, height: 6 }} />
    </div>
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
