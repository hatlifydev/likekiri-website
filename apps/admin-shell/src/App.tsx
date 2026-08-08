import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { api, type Me, type ShellManifest } from './api';
import { matchModuleRoute } from './federation';
import { Link, navigate, usePath } from './router';
import { adminCss } from './styles';
import { AcceptInvite } from './views/AcceptInvite';
import { ChangePassword } from './views/ChangePassword';
import { Invitations } from './views/Invitations';
import { Login } from './views/Login';
import { ModulePage } from './views/ModulePage';
import { RegistryView } from './views/RegistryView';
import { Users } from './views/Users';

function Layout({
  me,
  manifest,
  onLogout,
  children,
}: {
  me: Me;
  manifest: ShellManifest | null;
  onLogout: () => void;
  children: ReactNode;
}): ReactElement {
  const path = usePath();
  const item = (to: string, label: string): ReactElement => (
    <Link key={to} to={to} className={path === to ? 'activo' : ''}>
      {label}
    </Link>
  );
  const puede = (permission: string): boolean =>
    me.isSuperadmin || me.permissions.includes(permission);
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          Like<span>Kiri</span> admin
        </div>
        <nav>
          {puede('users.read') && item('/usuarios', 'Usuarios')}
          {puede('users.read') && item('/invitaciones', 'Invitaciones')}
          {puede('registry.read') && item('/registry', 'Registry')}
          {/* Entradas de menú aportadas por módulos, ya filtradas por permisos
              en el servidor. */}
          {(manifest?.menu ?? [])
            .filter((entry) => entry.slot === 'sidebar')
            .map((entry) => item(entry.path, entry.label))}
          {item('/password', 'Mi contraseña')}
        </nav>
        <div className="abajo">
          {me.email}
          <button onClick={onLogout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}

function NotFound(): ReactElement {
  return (
    <>
      <h1>404</h1>
      <p className="muted">Esta página no existe en el panel.</p>
    </>
  );
}

export function App(): ReactElement {
  const path = usePath();
  const [me, setMe] = useState<Me | null>(null);
  const [manifest, setManifest] = useState<ShellManifest | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarSesion = useCallback((): void => {
    setLoading(true);
    api
      .me()
      .then((session) => {
        setMe(session);
        return api.manifest().then(setManifest);
      })
      .catch(() => {
        setMe(null);
        setManifest(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(cargarSesion, [cargarSesion]);

  const logout = (): void => {
    void api
      .logout()
      .catch(() => undefined)
      .then(() => {
        setMe(null);
        setManifest(null);
        navigate('/login');
      });
  };

  // Página pública: aceptar invitación (no exige sesión).
  if (path === '/accept-invite') {
    return (
      <>
        <style>{adminCss}</style>
        <AcceptInvite />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <style>{adminCss}</style>
        <div className="centrado">
          <p className="muted">Cargando…</p>
        </div>
      </>
    );
  }

  // Sin sesión → login, venga de donde venga.
  if (me === null) {
    return (
      <>
        <style>{adminCss}</style>
        <Login
          onLogin={() => {
            cargarSesion();
            navigate('/usuarios');
          }}
        />
      </>
    );
  }

  let contenido: ReactElement;
  const moduleMatch = manifest === null ? null : matchModuleRoute(manifest.routes, path);
  switch (path) {
    case '/':
    case '/usuarios':
      contenido = <Users />;
      break;
    case '/invitaciones':
      contenido = <Invitations />;
      break;
    case '/registry':
      contenido = <RegistryView />;
      break;
    case '/password':
      contenido = <ChangePassword />;
      break;
    case '/login':
      navigate('/usuarios');
      contenido = <Users />;
      break;
    default:
      contenido =
        moduleMatch === null ? (
          <NotFound />
        ) : (
          <ModulePage route={moduleMatch.route} params={moduleMatch.params} />
        );
  }

  return (
    <>
      <style>{adminCss}</style>
      <Layout me={me} manifest={manifest} onLogout={logout}>
        {contenido}
      </Layout>
    </>
  );
}
