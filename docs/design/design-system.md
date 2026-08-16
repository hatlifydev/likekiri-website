# Sistema de diseño del sitio público — propuesta

> **Estado: propuesta, sin implementar.** Este documento define el sistema de design
> tokens para `likekiri.com` (apps/web-shell). No modifica `packages/tokens` ni
> ningún componente; la implementación se hará por fases (ver §8) con confirmación
> previa en cada una.

## 1. Principios

1. **Una sola fuente de verdad.** Todo color, tamaño tipográfico, espaciado, radio,
   sombra y duración vive en `packages/tokens`. Ningún componente de
   `apps/web-shell` (ni de módulos) declara valores literales.
2. **Light-first con franjas oscuras.** La base del sitio es clara sobre un neutro
   cálido (no blanco puro). El hero, el header y el footer son *franjas oscuras*:
   un tema invertido explícito con sus propios tokens (`dark.*`), no una excepción
   con hex sueltos.
3. **Compatibilidad aditiva.** Las variables `--lk-*` actuales las consumen
   `admin-shell` y 9 archivos de módulos (`chat`, `clientes`, `cuentas`, `media`,
   `ops`, `ejemplo-web`). Está prohibido renombrar o eliminar claves existentes;
   solo se añaden tokens y se re-apuntan valores. Detalle en §7.
4. **Sobriedad con una firma.** Un solo elemento memorable (el motivo Kiri, §6);
   todo lo demás —sombras, radios, transiciones— se mantiene discreto.
5. **Accesibilidad verificada, no estimada.** Cada par texto/fondo de esta paleta
   fue calculado con la fórmula de contraste WCAG; los ratios de §2.4 son reales.
   Mínimos: 4.5:1 texto normal, 3:1 texto grande y componentes de UI
   ([WCAG 2.1 — SC 1.4.3](https://www.w3.org/TR/WCAG21/#contrast-minimum),
   [SC 1.4.11](https://www.w3.org/TR/WCAG21/#non-text-contrast)).

## 2. Paleta con roles semánticos

Los nombres son **roles**, no descripciones del color. Un componente usa
`color.action`, jamás "el verde".

### 2.1 Neutros (tema claro, el tema base)

| Rol | Valor | Uso |
|---|---|---|
| `color.background` | `#FAF9F6` | Fondo base de página. Neutro cálido, no blanco puro. |
| `color.surface` | `#FFFFFF` | Superficies elevadas: tarjetas, paneles. |
| `color.surfaceSunken` | `#F2F0EA` | Superficies hundidas: bloques alternos, fondos de sección. |
| `color.text` | `#1C2420` | Texto primario: titulares y cuerpo. Tinta verdosa, no negro puro. |
| `color.textSecondary` | `#45514B` | Texto secundario: intros, descripciones en tarjetas. |
| `color.textMuted` | `#5F6B64` | Texto terciario: fechas, captions, metadatos. |
| `color.border` | `#E5E2DA` | Bordes decorativos: tarjetas, separadores. |
| `color.borderStrong` | `#828B84` | Bordes que identifican componentes de UI (inputs): cumple 3:1. |

### 2.2 Marca

**Verde (acción y sistema).** El verde corporativo `#2E8B57` da 4.25:1 sobre
blanco: **no alcanza AA para texto normal**. Por eso la escala separa el verde de
*identidad* (grande, gráfico) del verde de *acción* (interactivo, oscurecido):

| Rol | Valor | Uso |
|---|---|---|
| `color.brand` | `#2E8B57` | Identidad: iconografía grande, ilustración, motivo Kiri, texto ≥24px. *(existente, se conserva)* |
| `color.action` | `#28794C` | Relleno de botones primarios y controles con texto blanco (5.34:1). |
| `color.actionHover` | `#226741` | Hover de acción (6.81:1). |
| `color.actionActive` | `#1E5E3B` | Active/pressed (7.72:1). |
| `color.brandText` | `#1F6B45` | Enlaces y texto verde sobre fondo claro (6.14:1). |
| `color.brandTint` | `#E7F2EB` | Fondo de apoyo: chips, filas destacadas, hover de superficies. |
| `color.brandContrast` | `#F4F5F7` | Texto sobre rellenos verdes. *(existente, se conserva)* |

Estado deshabilitado: no se define un verde propio; un control disabled usa
`color.surfaceSunken` de fondo, `color.textMuted` de texto y `cursor: not-allowed`
(el texto disabled está exento de contraste en WCAG, pero mantenerlo legible es
deliberado).

**Dorado/oliva (acento de confianza).** Nunca es un color de acción: señala,
distingue, celebra. Prohibido como texto pequeño sobre claro sin oscurecer:

| Rol | Valor | Uso |
|---|---|---|
| `color.accent` | `#D99B3B` | Barra de anuncio, detalles del motivo Kiri, acentos gráficos. *(existente)* |
| `color.accentText` | `#8A5B13` | Texto dorado sobre fondo claro (5.56:1). |
| `color.accentTint` | `#F8EED9` | Fondo de apoyo dorado. |

### 2.3 Franja oscura (hero, header, footer)

| Rol | Valor | Uso |
|---|---|---|
| `color.dark.base` | `#12181F` | Fondo de franja. *(hoy `--lk-dark` hardcodeado)* |
| `color.dark.container` | `#243323` | Segundo plano de franja: degradado del hero. *(hoy `--lk-dark-container`)* |
| `color.dark.text` | `#F4F5F7` | Texto primario sobre franja (16.37:1). |
| `color.dark.textSecondary` | `#C6CFD8` | Navegación y texto secundario (11.32:1). |
| `color.dark.textMuted` | `#B9C3CD` | Leads y texto de apoyo (9.99:1). |
| `color.dark.border` | `#33414D` | Bordes sobre franja (selector de idioma). |
| `color.dark.brand` | `#3FA76C` | Verde legible sobre franja para texto/iconos (5.91:1) — el `#2E8B57` solo como relleno/gráfico. |

### 2.4 Colores de estado

| Rol | Valor | Contraste | Uso |
|---|---|---|---|
| `color.success` | `#1A7F4D` | 4.76:1 sobre `background` | Confirmaciones. Distinto de `action` a propósito: éxito informa, acción invita. |
| `color.successTint` | `#E3F2E9` | — | Fondo de mensajes de éxito. |
| `color.danger` | `#B91C1C` | 6.15:1 sobre `background` | Errores. *(existente: se re-apunta de `#f87171` al valor que los shells ya usan)* |
| `color.dangerTint` | `#FBE9E9` | — | Fondo de mensajes de error. |
| `color.warning` | `#92610C` | 5.33:1 sobre blanco | Avisos (texto/icono). |
| `color.warningTint` | `#FAF0DC` | — | Fondo de avisos. |

Regla transversal: el color **nunca es el único indicador** de estado — siempre
acompañado de icono o texto.

**Tabla de contrastes verificados** (fórmula WCAG 2.1, calculados — no estimados):

| Par | Ratio | AA texto normal (4.5:1) |
|---|---|---|
| `text` / `background` | 15.08 | ✓ |
| `textSecondary` / `background` | 7.88 | ✓ |
| `textMuted` / `background` | 5.29 | ✓ |
| blanco / `action` | 5.34 | ✓ |
| blanco / `actionHover` | 6.81 | ✓ |
| blanco / `actionActive` | 7.72 | ✓ |
| `brandText` / `background` | 6.14 | ✓ |
| `accentText` / `background` | 5.56 | ✓ |
| `dark.base` / `accent` (anuncio) | 7.40 | ✓ |
| `dark.text` / `dark.base` | 16.37 | ✓ |
| `dark.textMuted` / `dark.base` | 9.99 | ✓ |
| `dark.brand` / `dark.base` | 5.91 | ✓ |
| `success` / `background` | 4.76 | ✓ |
| `danger` / `background` | 6.15 | ✓ |
| `warning` / blanco | 5.33 | ✓ |
| `borderStrong` / `background` | 3.34 | ✓ (UI, mínimo 3:1) |
| blanco / `brand` `#2E8B57` | **4.25** | ✗ — por eso existe `action` |

## 3. Tipografía

### 3.1 Familias (máximo 2, licencia libre, self-hosted)

La política de privacidad del sitio promete "no usamos herramientas de terceros";
las fuentes se **auto-hospedan** como estáticos propios (woff2), jamás desde el CDN
de Google u otro tercero.

El cuerpo (`font.sans`) está decidido: **Inter**. Para el titular
(`font.display`) hay **dos opciones abiertas** — se decide en Fase 2 viendo ambas
renderizadas con contenido real (mismo hero, misma tarjeta, misma página legal):

| Rol | Familia | Licencia | Fuente oficial |
|---|---|---|---|
| `font.display` — **opción A** | **Space Grotesk** | SIL Open Font License 1.1 | [github.com/floriankarsten/space-grotesk](https://github.com/floriankarsten/space-grotesk) |
| `font.display` — **opción B** | **Source Serif 4** (óptico Display) | SIL Open Font License 1.1 (OFL-1.1) | [github.com/adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif) |
| `font.sans` — body, UI | **Inter** | SIL Open Font License 1.1 | [github.com/rsms/inter](https://github.com/rsms/inter) |
| `font.mono` — código (raro en el sitio) | stack de sistema actual | — | *(existente, se conserva)* |

**Opción A — Space Grotesk.** (Florian Karsten, 2018; derivada de Space Mono de
Colophon Foundry.) Grotesca geométrica con terminaciones cortadas y detalles
técnicos: transmite ingeniería sin frialdad, y diferencia los titulares del "look
Inter-para-todo" genérico. Riesgo asumido: puede leerse "startup tech" y restar
gravedad institucional ante clientes de los verticales jurídico y salud.

**Opción B — Source Serif 4.** Serif editorial de Adobe (proyecto Source,
OFL-1.1), variable y con tamaños ópticos — el óptico *Display* está dibujado
específicamente para titulares grandes. Registro de autoridad editorial e
institucional: publicación académica, despacho jurídico, informe clínico. Sobre la
base cálida de esta paleta produce un contraste serif-titular / sans-cuerpo
clásico de la prensa seria, y es la opción de menor riesgo para los verticales
regulados a los que apunta el sitio. Su costo: menos diferenciación "tech" y una
personalidad más convencional.

**Cuerpo — Inter.** (Rasmus Andersson.) Diseñada específicamente para interfaces
en pantalla: x-height alta, formas neutras, legibilidad probada en cuerpo pequeño
— el registro "empresarial que no estorba" que piden los textos largos de
Términos/Privacidad. Funciona como cuerpo de ambas opciones de titular, por lo que
la decisión A/B no toca el resto del sistema.

Las tres familias son SIL OFL 1.1 — verificado en los repositorios oficiales
enlazados: uso comercial y auto-hospedaje permitidos.

**La escala de §3.2 es idéntica para ambas opciones** (mismos tamaños,
line-heights y jerarquía); solo cambian dos ajustes ópticos si gana la opción B:
peso 600 en display/h1 (una serif a 700 engorda demasiado en pantalla) y
letter-spacing 0 (el tracking negativo que favorece a las grotescas estrangula los
serifs). La comparación en Fase 2 se hace con esos ajustes ya aplicados, para que
compita la mejor versión de cada una.

Fallbacks: `font.display = 'Space Grotesk', system-ui, sans-serif`;
`font.sans = 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
(el stack actual se mantiene como cola). Carga con `font-display: swap` y
`preload` de los woff2 críticos.

*Pendiente de verificar en Fase 2 (al descargar los archivos):* pesos exactos
disponibles por familia y tamaño de los woff2 subseteados (objetivo: latin +
latin-ext, ≤ ~35 KB por peso). Alternativa de costo cero documentada: mantener el
stack de sistema para body y hospedar solo la familia display elegida.

### 3.2 Escala modular

Razón **1.25** (tercera mayor) sobre base 16px. Cada paso es el anterior × 1.25;
los titulares grandes son fluidos con `clamp()` para no desbordar en móvil.

| Token | Tamaño | Line-height | Peso | Familia | Uso |
|---|---|---|---|---|---|
| `type.display` | `clamp(2.441rem, 1.9rem + 2.6vw, 3.4rem)` | 1.1 | 700 | display | H1 del hero. Letter-spacing −0.03em. |
| `type.h1` | `clamp(1.953rem, 1.7rem + 1.2vw, 2.441rem)` | 1.15 | 700 | display | Título de página. Letter-spacing −0.02em. |
| `type.h2` | `1.563rem` | 1.3 | 600 | display | Título de sección. Letter-spacing −0.02em. |
| `type.h3` | `1.25rem` | 1.35 | 600 | display | Título de tarjeta/subsección. |
| `type.lead` | `1.125rem` | 1.55 | 400 | sans | Párrafo destacado bajo el hero. *(paso intermedio deliberado)* |
| `type.body` | `1rem` | 1.6 | 400 | sans | Texto base. |
| `type.small` | `0.875rem` | 1.5 | 400 | sans | Texto de apoyo, leyendas de navegación. |
| `type.caption` | `0.8rem` | 1.4 | 500 | sans | Fechas, etiquetas, metadatos. Con `textMuted`. |

Pesos totales a hospedar: display 500/700 con opción A, o 400/600 del óptico
Display con opción B; sans 400/600 (el 500 de captions puede resolverse con
400+`font-variation-settings` si se usa la variable, a decidir en Fase 2).
Jerarquía estricta: un `h1` por página, sin saltos de nivel.

## 4. Espaciado, radios y elevación

### 4.1 Espaciado — base 4px

Escala numerada donde el sufijo son múltiplos de 4px. Los alias actuales
(`xs`–`xl`) se conservan apuntando al paso equivalente.

| Token | Valor | Alias actual |
|---|---|---|
| `space.1` | 0.25rem (4px) | `xs` |
| `space.2` | 0.5rem (8px) | `sm` |
| `space.3` | 0.75rem (12px) | |
| `space.4` | 1rem (16px) | `md` |
| `space.5` | 1.25rem (20px) | |
| `space.6` | 1.5rem (24px) | |
| `space.8` | 2rem (32px) | `lg` |
| `space.10` | 2.5rem (40px) | |
| `space.12` | 3rem (48px) | |
| `space.16` | 4rem (64px) | `xl` |
| `space.20` | 5rem (80px) | |
| `space.24` | 6rem (96px) | |

Regla de migración: los valores intermedios de hoy se redondean al paso más
cercano (`0.55rem`→`space.2`, `0.78rem`→`space.3`, `1.4rem`→`space.6`,
`1.6rem`→`space.6`, `4.25rem`→`space.16`, `5.5rem`→`space.20`). Prohibido crear
pasos nuevos por comodidad.

### 4.2 Radios

| Token | Valor | Uso |
|---|---|---|
| `radius.sm` | 4px | Chips, badges. *(existente)* |
| `radius.md` | 8px | Inputs, botones cuadrados. *(existente)* |
| `radius.lg` | 16px | Tarjetas, paneles, islas. *(existente; absorbe los 14px y 20px actuales)* |
| `radius.xl` | 24px | Contenedores destacados. |
| `radius.hero` | 40px | Esquinas de las franjas hero/footer. *(hoy hardcodeado)* |
| `radius.pill` | 999px | Botones, selector de idioma, barras de acento. |

### 4.3 Elevación — 3 niveles sobrios

Sombra de tinta fría derivada de `dark.base` `#12181F` (nunca negro puro), doble
capa para suavidad. La elevación acompaña a la interacción, no decora.

| Token | Valor | Uso |
|---|---|---|
| `shadow.1` | `0 1px 2px rgba(18,24,31,0.06), 0 2px 8px rgba(18,24,31,0.04)` | Tarjeta en reposo. |
| `shadow.2` | `0 4px 12px rgba(18,24,31,0.08), 0 12px 24px rgba(18,24,31,0.06)` | Tarjeta hover, dropdowns. |
| `shadow.3` | `0 16px 40px rgba(18,24,31,0.14)` | Elementos flotantes (widget de chat, modales). |

Desaparecen: las sombras teñidas de verde de los botones (`rgba(46,139,87,…)`) —
el hover de un botón se expresa con `actionHover` + micro-desplazamiento, no con
resplandor de color.

### 4.4 Movimiento

| Token | Valor | Uso |
|---|---|---|
| `motion.fast` | 150ms | Hovers de enlaces, color de texto. |
| `motion.base` | 250ms | Botones, tarjetas, subrayados. |
| `motion.slow` | 400ms | Revelados de secciones. |
| `motion.ease` | `cubic-bezier(0.2, 0, 0, 1)` | Curva única del sitio (salida desacelerada). |

`prefers-reduced-motion: reduce` sigue anulando toda animación y transición, como
hoy.

### 4.5 Layout

| Token | Valor | Uso |
|---|---|---|
| `layout.container` | 1080px | Ancho máximo de contenido. *(hoy hardcodeado)* |
| `layout.gutter` | `space.5` (1.25rem) | Padding lateral del contenedor. |

Breakpoints de verificación (no tokens: el CSS actual es fluido y debe seguir
siéndolo): 320 / 768 / 1024 / 1440.

## 5. Reglas de uso

- **Prohibido** cualquier hex, rem tipográfico, px de espaciado o sombra literal en
  `apps/web-shell` y módulos. Todo pasa por `var(--lk-…)`.
- Botones primarios: fondo `action`, texto `brandContrast`; secundarios: borde
  `currentColor` como hoy. `brand` `#2E8B57` no se usa como fondo de texto normal.
- Enlaces en texto corrido: `brandText`, no `brand`.
- La barra degradada verde→dorado bajo los `h2` se retira: la reemplaza el
  separador Kiri (§6). Degradados solo en el fondo del hero.
- Texto sobre franja oscura usa exclusivamente los roles `dark.*`.

## 6. Motivo de marca: la rama de Kiri

> **Revisión (cierre de Fase 2):** las hojas acorazonadas se descartaron por
> decisión del propietario — leían demasiado orgánicas para una web
> empresarial. Las terminaciones de la rama son ahora **nodos circulares**:
> rellenos en las bifurcaciones, huecos en las puntas, y un nodo terminal en
> dorado como foco. El motivo pasa de "rama con hojas" a **rama-diagrama**,
> puente directo con el lenguaje de proceso de §9. El resto de las reglas de
> esta sección (trazo constante, geometría de pocos puntos, familia limitada
> de ángulos, máximo 3 apariciones) sigue vigente.

*(Descripción para implementar en Fase 2/5; no existe aún.)*

**Concepto.** La paulownia (kiri) es el árbol de crecimiento más rápido conocido y
sus hojas jóvenes son grandes y acorazonadas. El grafismo es **una rama en
crecimiento**: un trazo continuo fino (stroke 1.5px, `currentColor`, sin relleno)
que nace de un punto, se bifurca dos o tres veces con curvas asimétricas —el
crecimiento no es simétrico— y termina cada rama en una hoja acorazonada pequeña,
una de ellas aún plegada (brote). Un solo path SVG, escalable, monocromo.

**Ejecución: geométrica y abstracta, no botánica.** La rama es un *diagrama* de
crecimiento, no un dibujo de planta. Reglas concretas: curvas construidas con pocos
puntos de control (arcos y béziers amplios, nunca trazo "a mano alzada" con
temblor); grosor de trazo constante en todo el path (sin modulación caligráfica);
las hojas son la forma acorazonada reducida a su mínima expresión geométrica —dos
arcos y un vértice—, sin nervaduras, texturas ni degradados internos; ángulos de
bifurcación repetidos de una familia limitada (p. ej. ~30°/~55°) para que el
conjunto se lea como sistema y no como ilustración. Si un boceto empieza a parecer
acuarela, grabado o clipart botánico, está mal: debe emparentarse más con un
diagrama de nodos que con un herbario. Antes de implementar nada, en Fase 2 se
presentan **2–3 bocetos SVG** con distintos grados de abstracción y se elige uno.

**Apariciones — máximo 3 en todo el sitio:**

1. **Hero:** la rama crece desde la esquina inferior izquierda, a gran escala,
   en `dark.brand` con opacidad ~0.18 sobre la franja oscura; una única hoja
   terminal en `accent` como punto focal. Sin animación de flotación: si hay
   motion, un único trazado progresivo (`stroke-dashoffset`) al cargar, una vez.
2. **Separador de sección:** versión mínima horizontal (un tallo con una
   bifurcación y una hoja, ~90×16px) que sustituye a la barra degradada bajo los
   `h2`, en `brand` sobre claro.
3. **Footer:** la misma rama del hero, invertida y recortada por el borde
   superior de la franja, opacidad ~0.12.

**Qué reemplaza:** las figuras flotantes genéricas actuales de `decor.tsx` (hojas
abstractas, flechas y puntos con parallax) se retiran. Una firma clara vale más que
seis adornos animados.

## 7. Compatibilidad con tokens existentes

Consumidores actuales de `--lk-*` y `tokens.*`: `apps/admin-shell` y
`modules/{chat, clientes, cuentas, media, ops, ejemplo-web}`.

- **Se conservan** todos los nombres existentes: `color.{background, surface,
  text, textMuted, brand, brandContrast, accent, danger, border}`, `font.{sans,
  mono}`, `space.{xs, sm, md, lg, xl}`, `radius.{sm, md, lg}`.
- **Se re-apuntan** a los valores del tema claro los que hoy tienen valor oscuro
  (`background`, `surface`, `text`, `textMuted`, `border`, `danger`). Riesgo bajo:
  ambos shells ya los pisan con estos mismos valores claros vía override, así que
  el valor *en runtime* no cambia para nadie; los overrides se eliminan después.
- **Se añaden** los grupos y claves nuevos de §2–§4 (`dark.*`, `action*`, escalas,
  `type.*`, `shadow.*`, `motion.*`, `layout.*`).
- `cssVariables()` de `packages/tokens` aplana hoy solo dos niveles
  (`--lk-color-brand`); en Fase 1 debe extenderse a aplanado recursivo para grupos
  anidados (`--lk-color-dark-base`), manteniendo idénticas las variables ya
  emitidas.
- Verificación obligatoria en Fase 1: `pnpm typecheck` y `pnpm build` recursivos
  (admin-shell y módulos incluidos) + revisión visual del admin.

## 8. Plan de implementación por fases

Cada fase termina en commit(s) atómico(s) en imperativo y **espera confirmación**
antes de continuar.

| Fase | Alcance | Archivos principales |
|---|---|---|
| **1 — Tokens** | Implementar §2–§4 en `packages/tokens` (aditivo), `cssVariables` recursivo, y `web-shell/styles.ts` consume tokens sin overrides hex. | `packages/tokens/src/index.ts`, `apps/web-shell/src/styles.ts` |
| **2 — Layout, header y hero** | Dos decisiones previas con material renderizado: comparativa tipográfica A/B (§3.1) y 2–3 bocetos SVG del motivo Kiri (§6). Luego: fuentes self-hosted (woff2 + `@font-face` + preload), contenedor, franja oscura, rama Kiri en hero, retirar inline-style del logo (`Document.tsx:38`). | `apps/web-shell/src/{styles.ts, Document.tsx, decor.tsx}`, `apps/web-shell/public/` |
| **3 — Tarjetas y botones** | Estados `action*` en botones, elevación `shadow.*`, tarjetas/avatar/persona con tokens. | `apps/web-shell/src/styles.ts` |
| **4 — Secciones y páginas** | Bloques/alternos, prosa, listas, footer, anuncio, páginas de error; márgenes inline de `Home/Personas/Equipo` → clases. | `apps/web-shell/src/{styles.ts, pages/*}` |
| **5 — Pulido** | Transiciones con `motion.*`, separador Kiri bajo h2, rama en footer, retiro de figuras antiguas, QA: contraste AA, reduced-motion, responsive 320/768/1024/1440. | `apps/web-shell/src/{styles.ts, decor.tsx}` |

Fuera de alcance de todas las fases: `apps/core`, `packages/contract`, lógica de
módulos, y el diseño del admin (solo se verifica que no se rompa).

## 9. Dirección distintiva: el proceso como lenguaje visual

*(Añadido al cierre de Fase 2, tras evaluar que repintar la estructura actual
—grillas uniformes de tarjetas en todas las secciones— dejaría un sitio
genérico bien pintado.)*

La identidad visual se deriva del propósito de la empresa: **automatización de
procesos con ingeniería honesta**. El motivo Kiri revisado (rama-diagrama de
nodos, §6) es la semilla de un lenguaje que se extiende al layout:

1. **"Cómo trabajamos" como pipeline real.** Es la única sección cuyo contenido
   es una secuencia verdadera (diagnóstico → piloto → despliegue →
   acompañamiento): se compone como pipeline con línea conectora continua y
   nodos numerados —la misma familia de trazo y ángulos de la rama—, no como
   cuatro tarjetas iguales. La numeración solo aquí: numerar lo que no es
   secuencia es decoración.
2. **Romper la grilla uniforme de "Qué hacemos".** Composición asimétrica con
   etiquetas técnicas en `font.mono` (BATCH · RPA · IA · RAG) como eyebrows y
   un ítem destacado; tarjetas iguales solo donde los ítems son realmente
   equivalentes.
3. **Un acento por sección.** Fuera la barra degradada verde→dorado bajo cada
   h2 (la reemplaza el separador-rama de §6); las texturas de líneas
   verticales se eliminaron al adoptar la paleta cálida — la alternancia de
   fondos planos (`background` / `surfaceSunken`) es el único ritmo del lienzo.
4. **El dorado como señal, no como decoración:** un solo nodo/detalle dorado
   por pantalla (el foco), igual que en la rama del hero.

Aplicación: puntos 3 parcial y motivo ya en Fase 2; el resto define el alcance
de la Fase 4 (recomposición de la Home) y el separador-rama queda en Fase 5.
