import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { routeForPath } from '../../app/routes';

export function AppShell() {
  const { pathname } = useLocation();
  const route = routeForPath(pathname);

  // Keep the document title in sync and reset scroll on navigation.
  useEffect(() => {
    document.title = route.home ? route.title : `${route.title} · DSP Lab`;
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar route={route} />
        <main id="content" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
