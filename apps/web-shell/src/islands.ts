import { init, loadRemote } from '@module-federation/runtime';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createElement, type ComponentType } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

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
    const element = createElement(Component, spec.props);
    if (spec.el.dataset['hydrate'] === '1') {
      // El servidor del módulo ya pintó el HTML (ssr: 'server'): se hidrata.
      hydrateRoot(spec.el, element);
    } else {
      createRoot(spec.el).render(element);
    }
  } catch (error) {
    console.error(`[likekiri] la isla ${spec.moduleId}/${spec.exposed} falló:`, error);
    markFailed(spec.el);
  }
}

function boot(): void {
  const specs = collect();
  if (specs.length === 0) return;
  // type 'module': los remotos se construyen con Vite y son ESM; sin esto el
  // runtime los inyecta como script clásico y la sintaxis import revienta.
  const remotes = [
    ...new Map(
      specs.map((spec) => [
        spec.moduleId,
        { name: spec.moduleId, entry: spec.remoteEntry, type: 'module' as const },
      ]),
    ).values(),
  ];
  // El host aporta su React a los remotos (singleton): sin esto el loadShare
  // del remoto resuelve null y los hooks revientan.
  init({
    name: 'likekiri_web',
    remotes,
    shared: {
      react: {
        version: '19.2.8',
        scope: 'default',
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: false },
      },
      'react-dom': {
        version: '19.2.8',
        scope: 'default',
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: false },
      },
    },
  });
  specs.forEach((spec) => {
    void mount(spec);
  });
}

boot();
