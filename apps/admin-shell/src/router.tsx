import { useSyncExternalStore, type MouseEvent, type ReactElement, type ReactNode } from 'react';

/** Router mínimo por history API: suficiente para la SPA de admin. */

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

window.addEventListener('popstate', notify);

export function navigate(to: string): void {
  history.pushState(null, '', to);
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function Link({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
