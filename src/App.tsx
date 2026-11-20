import React, { useCallback, useEffect, useState } from 'react';
import { CatalogsView } from './client/views/CatalogsView';
import { DmView } from './client/views/DmView';
import { LauncherView } from './client/views/LauncherView';
import { LocationsView } from './client/views/LocationsView';
import { PlayerView } from './client/views/PlayerView';
import { TvView } from './client/views/TvView';

function normalizePath(pathname: string): string {
  if (pathname.startsWith('/tv')) return '/tv';
  if (pathname.startsWith('/play')) return '/play';
  if (pathname.startsWith('/dm')) return '/dm';
  if (pathname.startsWith('/locations')) return '/locations';
  if (pathname.startsWith('/catalogs')) return '/catalogs';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return normalizePath(window.location.pathname);
  });

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((targetPath: string) => {
    const clean = normalizePath(targetPath);
    if (window.location.pathname !== clean) {
      window.history.pushState({}, '', clean);
    }
    setRoute(clean);
  }, []);

  if (route === '/tv') {
    return <TvView onNavigate={navigate} />;
  }
  if (route === '/play') {
    return <PlayerView onNavigate={navigate} />;
  }
  if (route === '/dm') {
    return <DmView onNavigate={navigate} />;
  }
  if (route === '/locations') {
    return <LocationsView onNavigate={navigate} />;
  }
  if (route === '/catalogs') {
    return <CatalogsView onNavigate={navigate} />;
  }
  return <LauncherView onNavigate={navigate} />;
}
