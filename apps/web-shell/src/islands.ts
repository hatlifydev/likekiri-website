import { init, loadRemote } from '@module-federation/runtime';
import { createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Runtime cliente de islas: escanea los placeholders emitidos por el SSR,
 * carga cada componente remoto vía Module Federation y lo monta. Una isla que
 * falla degrada solo su hueco, nunca el resto de la página.
 */

interface IslandSpec {
  el: HTMLElement;
  moduleId: string;
  /** Nombre expuesto sin el prefijo "./": "HelloIsland". */
  exposed: string;
  remoteEntry: string;
  props: Record<string, unknown>;
}

function collect(): IslandSpec[] {
  const nodes = document.querySelectorAll<HTMLElement>('[data-likekiri-island]');
  const specs: IslandSpec[] = [];
  nodes.forEach((el) => {
    const spec = el.dataset['likekiriIsland'] ?? '';
    const slash = spec.indexOf('/');
    const remoteEntry = el.dataset['remote'] ?? '';
    if (slash <= 0 || remoteEntry === '') return;
    let props: Record<string, unknown> = {};
    try {
      props = JSON.parse(el.dataset['props'] ?? '{}') as Record<string, unknown>;
    } catch {
      // props corruptas: la isla se monta sin props antes que no montarse
    }
    specs.push({
      el,
      moduleId: spec.slice(0, slash),
      exposed: spec.slice(slash + 1).replace(/^\.\//, ''),
      remoteEntry,
      props,
    });
  });
  return specs;
}

function markFailed(el: HTMLElement): void {
  el.innerHTML =
    '<div class="isla-error">Este componente no está disponible en este momento.</div>';
}

async function mount(spec: IslandSpec): Promise<void> {
  try {
    const remoteModule = await loadRemote<Record<string, unknown>>(
      `${spec.moduleId}/${spec.exposed}`,
    );
    const candidate = remoteModule?.[spec.exposed] ?? remoteModule?.['default'];
    if (typeof candidate !== 'function') {
      throw new Error(`el remoto no exporta un componente "${spec.exposed}"`);
    }
    const Component = candidate as ComponentType<Record<string, unknown>>;
    createRoot(spec.el).render(createElement(Component, spec.props));
  } catch (error) {
    console.error(`[likekiri] la isla ${spec.moduleId}/${spec.exposed} falló:`, error);
    markFailed(spec.el);
  }
}

function boot(): void {
  const specs = collect();
  if (specs.length === 0) return;
  const remotes = [
    ...new Map(
      specs.map((spec) => [
        spec.moduleId,
        { name: spec.moduleId, entry: spec.remoteEntry },
      ]),
    ).values(),
  ];
  init({ name: 'likekiri_web', remotes });
  specs.forEach((spec) => {
    void mount(spec);
  });
}

boot();
