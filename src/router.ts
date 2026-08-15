import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'auth' }
  | { name: 'tools'; category?: string }
  | { name: 'tool'; id: string }
  | { name: 'dashboard' }
  | { name: 'pricing' }
  | { name: 'admin' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  switch (parts[0]) {
    case 'auth':
      return { name: 'auth' };
    case 'tools':
      return { name: 'tools', category: parts[1] };
    case 'tool':
      return { name: 'tool', id: parts[1] ?? '' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'pricing':
      return { name: 'pricing' };
    case 'ai':
      return { name: 'tools' };
    case 'admin':
      return { name: 'admin' };
    default:
      return { name: 'home' };
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    const clean = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
    if (window.location.hash === clean) {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      window.location.hash = clean;
    }
  }, []);

  return { route, navigate };
}
